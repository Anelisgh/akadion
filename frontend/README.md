# Akadion Frontend

Acesta este frontend-ul aplicatiei Akadion, o platforma academica construita in jurul libertatii de a alege cursurile (stil free-elective). Platforma faciliteaza interactiunea dintre profesori si studenti si integreaza un asistent bazat pe AI (Aky) conectat la resursele cursurilor.

## Tehnologii Principale

* **Framework:** React 18
* **Build Tool:** Vite
* **Routing:** React Router v6 (`react-router-dom`)
* **Styling:** Tailwind CSS (alaturi de componente UI bazate pe arhitectura shadcn/ui)
* **API Client:** Axios
* **Pictograme:** Lucide React

## Structura Proiectului

Directorul `/src` este organizat astfel:

* `/api` - Configurarile instantei de Axios pentru comunicarea cu backend-ul, inclusiv gestiunea CSRF.
* `/auth` - Providerul de context pentru starea globala de autentificare si utilitarele de delogare.
* `/components` - Componente React reutilizabile:
  * `/chat` - Widget-ul plutitor pentru asistentul AI Aky.
  * `/ui` - Componente generice (ex: Butoane, Card-uri, Input-uri).
  * `AppShell.jsx` - Structura principala (layout) a paginilor, meniul de navigare si tab-urile cursurilor.
* `/lib` - Servicii, functii utilitare si call-uri de retea:
  * `aky.js` - Integrarea RAG (AI Chat).
  * `courseThemes.js` - Gestionarea cromaticii per curs.
  * `professorCourses.js` - Toate apelurile HTTP legate de managementul cursurilor si saptamanilor.
  * `user.js` - Metode de gestiune profil si mapari de roluri.
* `/pages` - Paginile majore ale aplicatiei, rutate independent:
  * `DashboardPage.jsx`, `CoursesPage.jsx`, `CourseDetailPage.jsx`, `NewCoursePage.jsx`, `ProfilePage.jsx`.

## Rulare Locala

Sistemul se bazeaza pe un proxy setat in `vite.config.js` care redirectioneaza automat apelurile API (pe ruta `/api`), dar si rutele de autentificare OAuth2 (`/oauth2`, `/login`, `/logout`) catre backend (la portul implicit 8081). Aceasta abordare elimina complet problemele de CORS in dezvoltare.

Pentru a porni frontend-ul:

```bash
npm install
npm run dev
```

Platforma va fi disponibila la `http://localhost:5173`.
Aplicatia intercepteaza accesul neautentificat si redirectioneaza automat browserul la `/oauth2/authorization/keycloak` pentru initierea fluxului OIDC.
