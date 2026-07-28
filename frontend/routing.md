# Documentatie Rutare Frontend (React Router)

Rutarea aplicatiei se regaseste in fisierul `src/App.jsx`. Aplicatia foloseste `react-router-dom` (versiunea 6) cu componenta `<Routes>` pentru a gestiona paginile si restrictiile de acces.

## 1. Concepte Principale

Frontend-ul foloseste React Router combinat cu starea globala (din `AuthContext`) pentru a decide daca un utilizator poate accesa o anumita ruta. Exista mai multe componente Wrapper (High Order Components) care intercepteaza navigarea si forteaza redirecturi pe baza rolului si starii contului (`stareCont` in baza de date).

## 2. Rutele Aplicatiei

### 2.1 Rute Publice / Globale

* **`/*` (Fallback / Catch-All)**
  * Rutele necunoscute sunt prinse de un catch-all care randeaza explicit componenta `<NotFoundPage />`.

### 2.2 Rute de Inrolare si Asteptare (Cont in Pregatire)

Aceste rute folosesc `RequireAuthenticatedState` pentru a forta utilizatorii sa ramana in ele pana cand isi rezolva starea profilului.

* **`/complete-profile`**
  * Wrapper: `RequireAuthenticatedState` (permite doar state `INCOMPLET`).
  * Componenta: `CompleteProfilePage`.
* **`/asteptare-aprobare`**
  * Wrapper: `RequireAuthenticatedState` (permite doar state `PENDING`).
  * Mesaj temporar pentru aprobarea manuala din partea adminului.
* **`/cerere-respinsa`**
  * Wrapper: `RequireAuthenticatedState` (permite doar state `RESPINS`).
  * Pentru cand adminul a respins completarea profilului.
* **`/cont-dezactivat`**
  * Wrapper: `RequireAuthenticatedState` (permite doar state `INACTIV`).
  * Cont suspendat manual.

### 2.3 Rute pentru Aplicatia Activa (Student / Profesor / Admin)

Toti utilizatorii activati (state `ACTIV`) pot accesa aceste rute.

* **`/` (Dashboard)**
  * Wrapper: `RequireAuthenticatedState` (permite doar `ACTIV`).
  * Componenta: `ActiveHomePage` (Randeaza `DashboardPage`).
* **`/profile`**
  * Wrapper: `RequireAuthenticatedState` (permite doar `ACTIV`).
  * Componenta: `ProfilePage`.
* **`/courses`**
  * Wrapper: `RequireAuthenticatedState` (permite doar `ACTIV`).
  * Componenta: `CoursesPage`. Lista de cursuri disponibile/inrolate.
* **`/courses/:id`**
  * Wrapper: `RequireAuthenticatedState` (permite doar `ACTIV`).
  * Componenta: `CourseDetailPage`. Detaliile unui curs, modulele, chat-ul RAG, materialele (daca este inrolat).

### 2.4 Rute Restrictive pentru Profesori si Admini

* **`/courses/new`**
  * Wrapper: `RequireActiveProfessor` (permite doar `ACTIV` si rol de `PROFESOR` sau administrator capabil sa creeze cursuri - tehnic filtrat prin `isProfessorUser`).
  * Componenta: `NewCoursePage`.
* **`/admin/users`**
  * Wrapper: `RequireAdmin` (permite doar `ACTIV` si rol de `ADMIN`).
  * Componenta: `AdminUsersPage`. Gestionarea cererilor si statusurilor.

### 2.5 Redirect-uri de Compatibilitate (Legacy)

* **`/users`**
  * Foloseste `LegacyUsersRedirect` care trimite inteligent un `ADMIN` valid la `/admin/users` si ceilalti inapoi spre `/`.

## 3. Fluxul de Autentificare si Redirectionare Automata

Daca un utilizator neautentificat (sau cu sesiunea expirata) incearca sa acceseze ORICE ruta in afara de cele permise global, este interceptat de componenta `<LoginRedirect />`.

### `<LoginRedirect />`

Aceasta componenta simpla face doua lucruri:
1. Afiseaza o interfata "Se verifica sesiunea..." (`LoadingPage`).
2. Intr-un `useEffect`, forteaza o navigare completa de browser prin apelul `window.location.assign("/oauth2/authorization/keycloak")`.

Astfel, rutarea React se opreste temporar si paseaza controlul catre backend pentru initializarea fluxului standard OAuth2 (OIDC) catre Keycloak.

### Maparea Redirect-urilor in Functie de Stare (`routeByState`)

Aplicatia mentine un dictionar `routeByState` in `App.jsx` care dicteaza unde trebuie aruncat automat un user autentificat care greseste ruta.
* Exemplu: Daca userul are starea `INCOMPLET` si acceseaza `/courses`, wrapper-ul `RequireAuthenticatedState` vede mismatch-ul, si aplica redirect via `routeByState["INCOMPLET"]` (adica `/complete-profile`).

## 4. Validarea Rutelor

Frontend-ul valideaza constant starile prin Wrapper-e inainte de a monta continutul. Daca in timpul navigarii Axios returneaza `401 Unauthorized` de la backend (sesiune pierduta), `AuthContext` actualizeaza starea globala, declansand `LoginRedirect` si repornind autentificarea complet transparent pentru utilizator.
