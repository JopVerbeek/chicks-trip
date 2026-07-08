# 🏡 Chicks Trip — huisjes stemming

Een simpele website om samen te kiezen waar we heen gaan (13–15 november 2026).
Bekijk alle opties, zie ze op de kaart en **stem** op je favorieten.

- `index.html` — de pagina
- `css/styles.css` — vormgeving
- `js/data.js` — de lijst met huisjes (hier pas je opties aan)
- `js/app.js` — de logica (kaart + stemmen)
- `js/config.js` — hier zet je (optioneel) Firebase aan om stemmen te delen

---

## 1. Lokaal bekijken

Dubbelklik op `index.html` om hem in je browser te openen. Werkt meteen.
In deze modus worden je stemmen **alleen in je eigen browser** bewaard (test-modus).

---

## 2. Inloggen (login met een wachtwoord)

De pagina zit achter een login. Er zijn twee smaken — je kiest er één:

### A) Aanbevolen: echte login via Firebase (gratis, veilig)

Je maakt in Firebase **één gedeeld account** aan. Iedereen logt in met hetzelfde
wachtwoord, en Firebase controleert dat wachtwoord **op de server** — het staat dus
níét in de broncode. Dit stel je in bij stap 4 hieronder (Firebase). Kort:

- Zet `FIREBASE_CONFIG` in `js/config.js` (zie stap 4).
- Zet `LOGIN_EMAIL` in `js/config.js` op het e-mailadres van het gedeelde account
  (mag verzonnen zijn, bijv. `"chicks@trip.local"`).
- Het wachtwoord bepaal je zelf in de Firebase-console als je het account aanmaakt.

### B) Eenvoudig (val-terug, alleen als je géén Firebase gebruikt)

Als `FIREBASE_CONFIG` leeg is, gebruikt de pagina een simpel wachtwoord uit
`js/config.js`:

```js
const SITE_PASSWORD = "chicks2026";   // verander dit; null = geen login
```

> ⚠️ Deze val-terug is een licht "slotje op de deur", geen echte beveiliging: het
> wachtwoord staat in de broncode en is voor een handige bezoeker te vinden. Prima
> om lokaal te testen — gebruik anders optie **A**.

---

## 3. Online zetten via GitHub Pages (gratis)

1. Maak een gratis account op [github.com](https://github.com).
2. Maak een nieuwe **repository** aan, bijv. `chicks-trip` (zet op **Public**).
3. Upload alle bestanden uit deze map (sleep ze in het browservenster van GitHub,
   of gebruik "Add file → Upload files"). Zorg dat `index.html` in de hoofdmap staat.
4. Ga in de repo naar **Settings → Pages**.
5. Bij **Source** kies je branch `main` en map `/root`, klik **Save**.
6. Na een minuutje staat je site op:
   `https://<jouw-gebruikersnaam>.github.io/chicks-trip/`
7. Deel die link met de groep. 🎉

---

## 4. Firebase: gedeelde stemmen + echte login (gratis, ± 8 minuten)

Firebase regelt twee dingen tegelijk: iedereen ziet **live elkaars stemmen**, én de
**login** wordt server-side gecontroleerd. Alles kan gratis.

### 4a. Project + database

1. Ga naar [console.firebase.google.com](https://console.firebase.google.com) en log in.
2. Klik **Add project / Project toevoegen**, geef het een naam (bijv. `chicks-trip`),
   Google Analytics mag je uitzetten. Klik door tot het project klaar is.
3. In het linkermenu: **Build → Realtime Database → Create Database**.
   - Kies een locatie (bijv. `europe-west1`).
   - Kies **Start in locked mode** (de regels bij 4c zetten we straks goed).

### 4b. Login aanzetten (Authentication)

1. Linkermenu: **Build → Authentication → Get started**.
2. Tabblad **Sign-in method** → kies **Email/Password** → zet hem **Aan** (Enable) → **Save**.
3. Tabblad **Users** → **Add user**:
   - **Email:** hetzelfde als `LOGIN_EMAIL` in `config.js` (bijv. `chicks@trip.local`).
   - **Password:** het wachtwoord dat je met de groep deelt.
   - **Add user**.
   > Wil je het wachtwoord later wijzigen? Dat doe je hier bij deze gebruiker.

### 4c. Regels (alleen ingelogde mensen mogen stemmen)

Ga naar **Realtime Database → Rules**, plak dit en klik **Publish**:

```json
{
  "rules": {
    "votes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### 4d. Config koppelen

1. Ga naar **Project settings** (het tandwiel ⚙️ linksboven) → tabblad **General**.
2. Scroll naar **Your apps** → klik het web-icoon **`</>`**, geef een bijnaam op,
   registreer de app. Je krijgt nu een `firebaseConfig`-blok te zien.
3. Kopieer die waarden naar `js/config.js`:

   ```js
   const LOGIN_EMAIL = "chicks@trip.local";   // zelfde als de user hierboven

   const FIREBASE_CONFIG = {
     apiKey: "AIza....",
     authDomain: "chicks-trip.firebaseapp.com",
     databaseURL: "https://chicks-trip-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "chicks-trip",
     storageBucket: "chicks-trip.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef123456"
   };
   ```

   > Let op: de `databaseURL` moet erbij staan. Zie je hem niet? Ga terug naar
   > Realtime Database — bovenaan staat de URL.
4. Upload de aangepaste `config.js` naar GitHub. Klaar — er is nu een echte login én
   iedereen ziet elkaars stemmen live.

> 💡 **Belangrijk:** voeg bij **Authentication → Settings → Authorized domains** je
> GitHub Pages-domein toe (`<gebruikersnaam>.github.io`) als het inloggen daar niet
> meteen werkt. `localhost` staat er standaard al bij voor lokaal testen.

---

## 5. Opties aanpassen

Alle huisjes staan in `js/data.js`. Een optie ziet er zo uit — pas gerust prijzen,
teksten of coördinaten aan:

```js
{
  id: "texel-koornaar",   // niet wijzigen als er al gestemd is!
  name: "De Koorn-aar Groepsvilla",
  region: "Texel",
  town: "De Dennen (bij bos), Texel",
  persons: 12,
  bedrooms: 6,
  price: null,            // null = "op aanvraag"
  nights: 2,
  pets: true,
  rating: 8.6,
  coords: [53.064764, 4.762295],  // [breedtegraad, lengtegraad]
  link: "https://...",
  perks: ["Twee privé sauna's", "..."]
}
```

> ⚠️ De `id` wordt gebruikt om stemmen bij te houden. Verander een `id` niet
> nadat mensen al gestemd hebben, anders raken die stemmen "los".

Veel plezier met kiezen! ✨
