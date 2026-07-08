/* global L, OPTIONS, REGION_COLORS, FIREBASE_CONFIG, LOGIN_EMAIL, SITE_PASSWORD, firebase */
(function () {
  "use strict";

  // ── State ──────────────────────────────────────────────
  // votes = { optionId: { userName: true, ... }, ... }
  let votes = {};
  let userName = localStorage.getItem("vacay_name") || "";
  let sortBy = "votes";
  let regionFilter = "all";
  let markers = {};

  // Preferred order + emoji for the region clusters
  const REGION_ORDER = ["Texel", "Terschelling", "Zeeland", "Overijssel"];
  const REGION_EMOJI = {
    Texel: "🏝️",
    Terschelling: "⛵",
    Zeeland: "🦪",
    Overijssel: "🌳",
  };

  // ── Firebase (login + gedeelde stemmen) ────────────────
  const usingFirebase =
    typeof FIREBASE_CONFIG === "object" && FIREBASE_CONFIG && FIREBASE_CONFIG.databaseURL;
  if (usingFirebase) {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
    } catch (err) {
      console.error("Firebase-init mislukt:", err);
    }
  }
  const backend = createBackend();

  // ── DOM refs ───────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const optionsEl = $("#options");
  const identityAsk = $("#identity-ask");
  const identityDone = $("#identity-done");
  const nameInput = $("#name-input");
  const currentNameEl = $("#current-name");
  const storageNote = $("#storage-note");

  // ── Init ───────────────────────────────────────────────
  init();

  function init() {
    setupIdentity();
    setupControls();
    initMap();
    showStorageNote();
    setupAuth();
  }

  // ── Login / toegang ────────────────────────────────────
  function setupAuth() {
    let subscribed = false;
    const startVotes = () => {
      if (subscribed) return;
      subscribed = true;
      backend.subscribe((data) => {
        votes = data || {};
        render();
      });
    };

    if (usingFirebase) {
      setupFirebaseGate(startVotes);
    } else {
      setupLocalGate(startVotes);
    }
  }

  function shakeBox(box) {
    box.classList.remove("shake");
    void box.offsetWidth; // herstart de animatie
    box.classList.add("shake");
  }

  // Echte login via Firebase Authentication: één gedeeld account. Het
  // wachtwoord wordt server-side gecontroleerd en staat NIET in de broncode.
  function setupFirebaseGate(onAuthed) {
    const gate = $("#gate");
    const form = $("#gate-form");
    const input = $("#gate-input");
    const error = $("#gate-error");
    const box = gate.querySelector(".gate-box");
    const auth = firebase.auth();

    let unlocked = false;
    function unlock() {
      if (unlocked) return;
      unlocked = true;
      gate.hidden = true;
      document.body.classList.remove("locked");
      if (window._vacayMap) window._vacayMap.invalidateSize();
      onAuthed();
    }
    function lock() {
      gate.hidden = false;
      document.body.classList.add("locked");
      input.focus();
    }

    // Ingelogd blijven tussen bezoeken. Lukt dit niet (privémodus, geblokkeerde
    // opslag), dan gaan we door met de standaardinstelling zodat inloggen blijft
    // werken voor de huidige sessie.
    auth
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch(() => {});

    // Reageer op wijzigingen in de inlogstatus (bv. al ingelogd bij herbezoek).
    auth.onAuthStateChanged((user) => {
      if (user) unlock();
      else if (!unlocked) lock();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      error.hidden = true;
      const btn = form.querySelector("button");
      const email = typeof LOGIN_EMAIL === "string" ? LOGIN_EMAIL : "";
      btn.disabled = true;
      auth
        .signInWithEmailAndPassword(email, input.value)
        .then(() => {
          input.value = "";
          // Meteen openen na een geslaagde login — niet wachten op
          // onAuthStateChanged (dat vuurt niet in elke browser betrouwbaar).
          unlock();
        })
        .catch((err) => {
          error.hidden = false;
          error.textContent = friendlyAuthError(err);
          shakeBox(box);
          input.select();
        })
        .finally(() => {
          btn.disabled = false;
        });
    });
  }

  function friendlyAuthError(err) {
    const code = (err && err.code) || "";
    if (
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-login-credentials"
    ) {
      return "Onjuist wachtwoord — probeer het nog eens.";
    }
    if (code === "auth/too-many-requests") {
      return "Te veel pogingen. Wacht even en probeer opnieuw.";
    }
    if (code === "auth/network-request-failed") {
      return "Geen verbinding. Controleer je internet.";
    }
    if (code === "auth/user-not-found" || code === "auth/invalid-email") {
      return "Login niet gevonden — klopt LOGIN_EMAIL in config.js?";
    }
    return "Inloggen mislukt: " + (err && err.message ? err.message : code);
  }

  // Val-terug: eenvoudig wachtwoord uit config.js (alleen als Firebase niet
  // is ingesteld). Minder veilig, maar handig om lokaal te testen.
  function setupLocalGate(onAuthed) {
    const gate = $("#gate");
    const noPassword = typeof SITE_PASSWORD !== "string" || SITE_PASSWORD.length === 0;
    if (noPassword || localStorage.getItem("vacay_auth") === SITE_PASSWORD) {
      onAuthed();
      return;
    }

    gate.hidden = false;
    document.body.classList.add("locked");

    const form = $("#gate-form");
    const input = $("#gate-input");
    const error = $("#gate-error");
    const box = gate.querySelector(".gate-box");
    input.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value === SITE_PASSWORD) {
        localStorage.setItem("vacay_auth", SITE_PASSWORD);
        gate.hidden = true;
        document.body.classList.remove("locked");
        if (window._vacayMap) window._vacayMap.invalidateSize();
        onAuthed();
      } else {
        error.hidden = false;
        error.textContent = "Onjuist wachtwoord — probeer het nog eens.";
        shakeBox(box);
        input.select();
      }
    });
  }

  // ── Identity (who am I) ────────────────────────────────
  function setupIdentity() {
    refreshIdentity();

    $("#name-save").addEventListener("click", () => {
      const val = nameInput.value.trim();
      if (!val) {
        nameInput.focus();
        return;
      }
      userName = val;
      localStorage.setItem("vacay_name", userName);
      refreshIdentity();
      render();
    });

    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("#name-save").click();
    });

    $("#name-change").addEventListener("click", () => {
      identityDone.hidden = true;
      identityAsk.hidden = false;
      nameInput.value = userName;
      nameInput.focus();
    });
  }

  function refreshIdentity() {
    if (userName) {
      identityAsk.hidden = true;
      identityDone.hidden = false;
      currentNameEl.textContent = userName;
    } else {
      identityAsk.hidden = false;
      identityDone.hidden = true;
    }
  }

  // ── Controls (sort / filter) ───────────────────────────
  function setupControls() {
    const regionSelect = $("#region-select");
    const regions = [...new Set(OPTIONS.map((o) => o.region))];
    regions.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r;
      regionSelect.appendChild(opt);
    });

    $("#sort-select").addEventListener("change", (e) => {
      sortBy = e.target.value;
      render();
    });
    regionSelect.addEventListener("change", (e) => {
      regionFilter = e.target.value;
      render();
    });
  }

  function showStorageNote() {
    if (!backend.shared) {
      storageNote.hidden = false;
      storageNote.innerHTML =
        "🔒 <strong>Test-modus:</strong> stemmen worden alleen in jouw browser bewaard. " +
        "Wil je stemmen delen met de hele groep? Volg de uitleg in <code>README.md</code> (Firebase).";
    }
  }

  // ── Vote helpers ───────────────────────────────────────
  function voteCount(id) {
    return votes[id] ? Object.keys(votes[id]).length : 0;
  }
  function voterNames(id) {
    return votes[id] ? Object.keys(votes[id]) : [];
  }
  function hasVoted(id) {
    return !!(userName && votes[id] && votes[id][userName]);
  }

  function toggleVote(id) {
    if (!userName) {
      identityAsk.hidden = false;
      identityDone.hidden = true;
      nameInput.focus();
      storageNote.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    backend.toggle(id, userName, !hasVoted(id));
  }

  // ── Rendering ──────────────────────────────────────────
  function sortWithin(list) {
    return list.slice().sort((a, b) => {
      switch (sortBy) {
        case "price":
          return (a.price ?? Infinity) - (b.price ?? Infinity);
        case "persons":
          return b.persons - a.persons;
        case "votes":
        default:
          return voteCount(b.id) - voteCount(a.id);
      }
    });
  }

  function regionsInOrder() {
    const present = [...new Set(OPTIONS.map((o) => o.region))];
    const ordered = REGION_ORDER.filter((r) => present.includes(r));
    present.forEach((r) => {
      if (!ordered.includes(r)) ordered.push(r);
    });
    return regionFilter === "all" ? ordered : ordered.filter((r) => r === regionFilter);
  }

  function render() {
    optionsEl.innerHTML = "";

    regionsInOrder().forEach((region) => {
      const items = sortWithin(OPTIONS.filter((o) => o.region === region));
      if (!items.length) return;

      const cluster = document.createElement("div");
      cluster.className = "cluster";

      const prices = items.map((o) => o.price).filter((p) => p != null);
      const priceRange = prices.length
        ? `€${Math.min(...prices)} – €${Math.max(...prices)}`
        : "op aanvraag";

      const head = document.createElement("div");
      head.className = "cluster-head";
      head.style.borderColor = REGION_COLORS[region] || "#999";
      head.innerHTML =
        `<h3>${REGION_EMOJI[region] || "📍"} ${escapeHtml(region)}</h3>` +
        `<span class="cluster-meta">${items.length} optie(s) · ${priceRange}</span>`;

      const grid = document.createElement("div");
      grid.className = "cluster-grid";
      items.forEach((o) => grid.appendChild(buildCard(o)));

      cluster.appendChild(head);
      cluster.appendChild(grid);
      optionsEl.appendChild(cluster);
    });

    updateMarkerLabels();
  }

  function buildCard(o) {
    const color = REGION_COLORS[o.region] || "#555";
    const card = document.createElement("article");
    card.className = "opt-card";
    card.id = "card-" + o.id;

    // Hero photo (falls back to a coloured gradient if the image fails to load)
    const hero = document.createElement("div");
    hero.className = "opt-hero";
    hero.style.background = `linear-gradient(135deg, ${color}, ${shade(color, -18)})`;
    if (o.image) {
      const img = document.createElement("img");
      img.className = "opt-photo";
      img.src = o.image;
      img.alt = o.name;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => img.remove());
      hero.appendChild(img);
    }
    const regionBadge = document.createElement("span");
    regionBadge.className = "opt-region";
    regionBadge.textContent = o.region;
    hero.appendChild(regionBadge);

    const heroText = document.createElement("div");
    heroText.className = "opt-hero-text";
    heroText.innerHTML =
      `<h4>${escapeHtml(o.name)}</h4>` +
      `<p class="opt-town">📍 ${escapeHtml(o.town)}</p>`;
    hero.appendChild(heroText);

    // Body
    const body = document.createElement("div");
    body.className = "opt-body";

    const facts = document.createElement("div");
    facts.className = "opt-facts";
    facts.innerHTML =
      `<span class="fact">👥 ${o.persons} pers.</span>` +
      (o.bedrooms ? `<span class="fact">🛏️ ${o.bedrooms} kamers</span>` : "") +
      `<span class="fact price">${priceLabel(o)}</span>` +
      (o.rating ? `<span class="fact rating">⭐ ${o.rating.toString().replace(".", ",")}</span>` : "") +
      (o.pets === true ? `<span class="fact">🐾 huisdier ok</span>` : "");

    const perks = document.createElement("ul");
    perks.className = "opt-perks";
    o.perks.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      perks.appendChild(li);
    });

    const footer = document.createElement("div");
    footer.className = "opt-footer";

    const voteBtn = document.createElement("button");
    voteBtn.className = "vote-btn" + (hasVoted(o.id) ? " voted" : "");
    voteBtn.innerHTML =
      `<span>${hasVoted(o.id) ? "💖" : "🤍"}</span>` +
      `<span class="vote-count">${voteCount(o.id)}</span>`;
    voteBtn.title = hasVoted(o.id) ? "Klik om je stem terug te trekken" : "Stem op dit huisje";
    voteBtn.addEventListener("click", () => toggleVote(o.id));

    const link = document.createElement("a");
    link.className = "btn-link";
    link.href = o.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Bekijk →";

    footer.appendChild(voteBtn);
    footer.appendChild(link);

    const voters = document.createElement("div");
    voters.className = "voters";
    const names = voterNames(o.id);
    voters.innerHTML = names.length
      ? `Stemmen: <strong>${names.map(escapeHtml).join(", ")}</strong>`
      : "Nog geen stemmen";

    body.appendChild(facts);
    body.appendChild(perks);
    body.appendChild(footer);
    body.appendChild(voters);

    card.appendChild(hero);
    card.appendChild(body);

    // Hover ↔ map highlight
    card.addEventListener("mouseenter", () => highlightMarker(o.id, true));
    card.addEventListener("mouseleave", () => highlightMarker(o.id, false));

    return card;
  }

  function priceLabel(o) {
    if (o.price == null) return "💶 op aanvraag";
    const perNight = Math.round(o.price / o.nights);
    return `💶 €${o.price} (${o.nights} nt · ±€${perNight}/nt)`;
  }

  // ── Map ────────────────────────────────────────────────
  function initMap() {
    const map = L.map("map", { scrollWheelZoom: false }).setView([52.5, 5.0], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const bounds = [];
    OPTIONS.forEach((o) => {
      const color = REGION_COLORS[o.region] || "#555";
      const marker = L.circleMarker(o.coords, {
        radius: 10,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindPopup(popupHtml(o));
      marker.on("click", () => {
        const card = document.getElementById("card-" + o.id);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      markers[o.id] = marker;
      bounds.push(o.coords);
    });

    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40] });
    window._vacayMap = map;

    buildLegend();
  }

  function buildLegend() {
    const legend = document.getElementById("map-legend");
    if (!legend) return;
    const regions = [...new Set(OPTIONS.map((o) => o.region))];
    legend.innerHTML = regions
      .map((r) => {
        const count = OPTIONS.filter((o) => o.region === r).length;
        const color = REGION_COLORS[r] || "#999";
        return (
          `<span class="legend-item">` +
          `<span class="legend-dot" style="background:${color}"></span>` +
          `${escapeHtml(r)} (${count})</span>`
        );
      })
      .join("");
  }

  function popupHtml(o) {
    return (
      `<strong>${escapeHtml(o.name)}</strong><br>` +
      `${escapeHtml(o.region)} · ${o.persons} pers.<br>` +
      `${o.price == null ? "op aanvraag" : "€" + o.price + " / " + o.nights + " nt"}<br>` +
      `<a href="${o.link}" target="_blank" rel="noopener noreferrer">Bekijk huisje →</a>`
    );
  }

  function highlightMarker(id, on) {
    const m = markers[id];
    if (!m) return;
    m.setStyle({ radius: on ? 15 : 10, weight: on ? 3 : 2 });
    if (on) m.bringToFront();
  }

  function updateMarkerLabels() {
    OPTIONS.forEach((o) => {
      const m = markers[o.id];
      if (m) m.setPopupContent(popupHtml(o) + `<br>💖 ${voteCount(o.id)} stem(men)`);
    });
  }

  // ── Backends ───────────────────────────────────────────
  function createBackend() {
    if (usingFirebase) {
      try {
        const ref = firebase.database().ref("votes");
        return {
          shared: true,
          subscribe(cb) {
            ref.on(
              "value",
              (snap) => cb(snap.val() || {}),
              (err) => {
                // Meestal: database-regels staan nog op "locked". De pagina
                // blijft bruikbaar; stemmen laden dan (nog) niet.
                console.error("Kan stemmen niet laden:", err && err.message);
                cb({});
              }
            );
          },
          toggle(id, name, on) {
            const target = firebase.database().ref("votes/" + id + "/" + sanitizeKey(name));
            if (on) target.set(true);
            else target.remove();
          },
        };
      } catch (err) {
        console.error("Firebase-init mislukt, val terug op lokaal:", err);
      }
    }
    // Local fallback
    return {
      shared: false,
      subscribe(cb) {
        this._cb = cb;
        cb(readLocal());
        window.addEventListener("storage", (e) => {
          if (e.key === "vacay_votes") cb(readLocal());
        });
      },
      toggle(id, name, on) {
        const data = readLocal();
        data[id] = data[id] || {};
        if (on) data[id][sanitizeKey(name)] = true;
        else delete data[id][sanitizeKey(name)];
        if (Object.keys(data[id]).length === 0) delete data[id];
        localStorage.setItem("vacay_votes", JSON.stringify(data));
        if (this._cb) this._cb(data);
      },
    };
  }

  function readLocal() {
    try {
      return JSON.parse(localStorage.getItem("vacay_votes") || "{}");
    } catch {
      return {};
    }
  }

  // ── Utils ──────────────────────────────────────────────
  function sanitizeKey(name) {
    // Firebase keys may not contain . # $ [ ] /
    return name.replace(/[.#$/\[\]]/g, "_");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function shade(hex, percent) {
    const n = parseInt(hex.replace("#", ""), 16);
    let r = (n >> 16) + percent;
    let g = ((n >> 8) & 0x00ff) + percent;
    let b = (n & 0x0000ff) + percent;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }
})();
