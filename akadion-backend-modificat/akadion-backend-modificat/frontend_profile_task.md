# Task Frontend: Implementare Interfață "Setări Profil"

Pe partea de Backend, am refăcut logica de actualizare a profilului pentru a fi aliniată la cerințele de securitate (Zero-Trust) și la sincronizarea cu Keycloak. 

Mai jos găsești specificațiile pentru implementarea formularului de editare a profilului (Settings) în Frontend.

## 1. Ce avem deja în Frontend?
Momentan, există doar componenta `ProfilePage.jsx` (`/profile`), dar aceasta este **doar pentru afișare (Read-Only)**. Ai mână liberă să:
* Fie să adaugi un buton de "Editare" în `ProfilePage.jsx` care să randeze un formular.
* Fie să creezi o pagină nouă completă (`SettingsPage.jsx` la ruta `/settings`).

## 2. API Endpoints puse la dispoziție de Backend

Sistemul a fost divizat în **3 rute separate**, deoarece acțiunile asupra emailului și parolei sunt sensibile și trec prin Keycloak.

### A. Actualizare Date Personale (Fără validare Keycloak)
* **Metodă**: `PUT /api/auth/me`
* **Corp (JSON)**:
  ```json
  {
    "nume": "Popescu",
    "prenume": "Ion",
    "facultate": "Facultatea de Litere"
  }
  ```
* **Comportament**: Actualizează instant în baza de date locală PostgreSQL. Răspunde cu `200 OK` și noul obiect user.

### B. Schimbare Adresă de Email (Sincronizare Keycloak + Trimitere Mail)
* **Metodă**: `PUT /api/auth/me/email`
* **Corp (JSON)**:
  ```json
  {
    "email": "noul_email@akadion.ro"
  }
  ```
* **Comportament**: Modifică email-ul în Keycloak și în PostgreSQL, însă îl marchează cu `emailVerified=false`. Imediat după, Backend-ul declanșează un email automat de la Keycloak către adresa nouă cu un link de confirmare.
* **În Frontend**: După un răspuns `200 OK`, arată un Alert/Toast utilizatorului: *"Adresa a fost schimbată, te rugăm să verifici Inbox-ul noului email pentru confirmare."*

### C. Resetare / Schimbare Parolă (Zero-Trust)
* **Metodă**: `POST /api/auth/me/request-password-reset`
* **Corp**: Gol (fără JSON)
* **Comportament**: Am renunțat complet la formularul clasic de *"Parolă veche / Parolă nouă"* din rațiuni de securitate. 
* **În Frontend**: Ai nevoie doar de un buton simplu **"Schimbă Parola"**. Când utilizatorul apasă pe el, apelezi acest endpoint. Backend-ul va cere automat lui Keycloak să trimită un email de resetare cu link securizat cu valabilitate limitată. 
* Arată un Alert: *"Un link pentru resetarea parolei a fost trimis pe adresa ta de email."*

---

> **Notă pentru Frontend**: Toate aceste call-uri trebuie autentificate automat de instanța voastră de Axios (`axiosInstance.js`), deoarece conțin token-ul Bearer la cerere. Când dezvolți noile funcții, poți exporta rutele API direct în `src/lib/user.js`. Spor!
