// ─────────────────────────────────────────────────────────────
//  INLOGGEN
// ─────────────────────────────────────────────────────────────
//
// Er zijn twee manieren om de pagina achter een wachtwoord te zetten:
//
//  A) AANBEVOLEN — echte login via Firebase Authentication.
//     Je maakt in Firebase één gedeeld account aan (e-mail + wachtwoord).
//     Iedereen logt in met datzelfde wachtwoord. Firebase controleert het
//     wachtwoord op de server, dus het staat NIET in de broncode → veilig.
//     Vul hieronder LOGIN_EMAIL in en zet FIREBASE_CONFIG onderaan.
//     Stap-voor-stap uitleg staat in README.md.
//
//  B) EENVOUDIG (val-terug) — als Firebase NIET is ingesteld, wordt het
//     wachtwoord SITE_PASSWORD hieronder gebruikt. Let op: dat is een licht
//     "slotje op de deur", niet echt veilig (staat in de broncode). Gebruik
//     dan een wegwerpwachtwoord.

// (A) E-mailadres van het gedeelde Firebase-account. Zelf gekozen; hoeft geen
//     echt bestaand mailadres te zijn, bijv. "chicks@trip.local".
const LOGIN_EMAIL = "chicks@trip.nl";

// (B) Val-terug wachtwoord, alleen gebruikt als Firebase niet is ingesteld.
//     Zet op null om de val-terug login uit te schakelen.
const SITE_PASSWORD = "chicks2026";


// ─────────────────────────────────────────────────────────────
//  STEMMEN DELEN MET IEDEREEN (optioneel maar aanbevolen)
// ─────────────────────────────────────────────────────────────
//
// Standaard worden stemmen alleen in je EIGEN browser bewaard.
// Wil je dat iedereen elkaars stemmen ziet? Vul dan hieronder je
// gratis Firebase-gegevens in. Stap-voor-stap uitleg staat in README.md.
//
// Laat dit leeg (null) om alleen lokaal te testen.


const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDyDog2ATIcCCGMIrq41WvR0HaRfqPrfDE",
  authDomain: "chicks-trip.firebaseapp.com",
  databaseURL: "https://chicks-trip-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "chicks-trip",
  storageBucket: "chicks-trip.firebasestorage.app",
  messagingSenderId: "532030772494",
  appId: "1:532030772494:web:4c57093edbf7cb224b735f",
  measurementId: "G-EWSVQ1733E"
};

