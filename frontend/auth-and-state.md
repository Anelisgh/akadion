# Autentificare si Stare Globala

Gestionarea starii globale in frontend este concentrata exclusiv in jurul Autentificarii si Starii Utilizatorului. Sursa adevarului pentru utilizator este backend-ul. 

Codul specific este localizat in directorul `src/auth`.

## 1. Concepte de Securitate

Frontend-ul nu gestioneaza logica token-urilor JWT in memoria locala sau localStorage. Arhitectura de securitate foloseste modelul **BFF (Backend for Frontend)** via Spring Security pe server:
- Sesiunea se tine in browser ca un Cookie `SESSION` `HttpOnly`.
- Backend-ul rezolva schimbul OAuth2 catre Keycloak.
- Backend-ul trimite un token CSRF prin cookie-ul `XSRF-TOKEN`, pe care frontend-ul trebuie sa il foloseasca in fiecare cerere de modificare (POST/PUT/DELETE/PATCH).

## 2. Componentele Starii Globale

### 2.1 `AuthContext` si `AuthProvider` (`src/auth/AuthProvider.jsx`)

`AuthProvider` inveleste toata aplicatia React si stocheaza global informatii esentiale:

- **`loading`** (boolean): True cata vreme aplicatia inca interogheaza backend-ul la montarea initiala pentru a afla daca utilizatorul este logat.
- **`authenticated`** (boolean): True daca userul are o sesiune valida pe backend.
- **`user`** (Object): Datele profilului (id, nume, prenume, mail, rol, stareCont) luate din `GET /api/auth/me`.
- **`error`** (string): Stocheaza mesaje de eroare in caz ca verificarea conexiunii pica.
- **`refreshAuth`** (function): Fortaza o refetch-uire manuala a `GET /api/auth/me` si reseteaza flag-urile. E apelat automat la initializare si dupa actiuni de schimbare state (ex: cand userul isi completeaza profilul).
- **`setUser`**, **`setAuthenticated`**, **`setError`** (functions): Permite suprascrierea locala a starii contextului.
- **`startLogout`** (function): Declanaseaza deconectarea.

La montarea `<AuthProvider>`, un apel `useEffect` cheama `refreshAuth()`. Daca backend-ul intoarce `401 Unauthorized`, `authenticated` devine `false` (implicit curat). Daca returneaza date valide, `user` se populeaza cu starea (`INCOMPLET`, `PENDING`, `ACTIV`, etc) si datele utilizatorului.

### 2.2 Hook-ul `useAuth` (`src/auth/useAuth.js`)

Orice componenta are nevoie de identitatea userului sau de starea autentificarii poate importa si folosi acest custom hook.
Exemplu:
```javascript
import { useAuth } from "@/auth/useAuth"

function ComponentaMea() {
  const { user, authenticated } = useAuth()
  
  if (authenticated && user.stareCont === 'ACTIV') {
     // Userul este conectat si poate vedea date.
  }
}
```
Intern, valideaza ca este chemat in interiorul limitelor `AuthProvider` (altfel arunca eroare).

## 3. Delogarea (`src/auth/logout.js`)

Mecanismul de delogare in Spring Security si BFF trebuie tratat prin backend. 
Deoarece endpoint-ul `/logout` din Spring Security (care face si logout in Keycloak) presupune un redirect HTTP care omoara cookie-urile si trimite comanda catre IdP (Identity Provider), metoda expusa `startLogout()` doar redirectioneaza complet aplicatia via:

```javascript
window.location.assign("/logout")
```

Aceasta forta incarcarea rutei Backend `/logout` (care trece prin proxy-ul Vite), invalideaza Cookie-ul de sesiune, declanseaza logout in Keycloak, si apoi Keycloak arunca browser-ul inapoi spre index-ul aplicatiei, de unde se reia ciclul completat cu o lipsa de sesiune (care duce inapoi spre Keycloak Login automat).
