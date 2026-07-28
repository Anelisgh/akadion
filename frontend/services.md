# Servicii si Comunicare API

Toata logica de fetch si trimitere date catre backend este decuplata din componente si este extrasa sub forma de functii pure / servicii regasite in `src/lib`. Toate call-urile HTTP trec printr-o instanta pre-configurata de Axios.

## 1. Configurarea Axios (`src/api/axiosInstance.js`)

Pentru a asigura validitatea cererilor POST/PUT/DELETE catre un backend Spring Security protejat impotriva atacurilor CSRF (Cross-Site Request Forgery), instanta de Axios foloseste:
- `withCredentials: true` - Forteaza trimiterea automata a cookie-ului `SESSION` aferent utilizatorului autentificat cu fiecare cerere.
- `xsrfCookieName: "XSRF-TOKEN"` si `xsrfHeaderName: "X-XSRF-TOKEN"` - Extrage in mod automat token-ul de protectie setat de backend ca Cookie, si il mapeaza intr-un Header la urmatorele cereri pentru a valida identitatea sursei.

## 2. Servicii (Directorul `src/lib/`)

### 2.1 `user.js`
Gestionare si acces la functii despre utilizator.
- **`updateMyProfile(payload)`**: Endpoint-ul pentru trimiterea detaliilor modificate in `ProfilePage`. API: `PUT /api/auth/me`.
- **`updateMyEmail(email)`**: Permite actualizarea adresei, ceea ce declanseaza sincronizarea Keycloak si reverificarea.
- **`requestMyPasswordReset()`**: Solicita backend-ului rularea unui flow `Zero-Trust` prin Keycloak ExecuteActionsEmail (fara formular manual de schimbare pe frontend). API: `POST /api/auth/me/request-password-reset`.
- Utilitare ajutatoare sincrone: `isProfessorUser(user)`, `isAdminUser(user)`, `isStudentUser(user)`, si `getUserDisplayName(user)`. Ele ajuta rutele sa decida accesul (Role-Based Access Control in frontend).

### 2.2 `aky.js`
Integrare curata a widget-ului de AI.
- Expune functiile `sendAkyCourseQuestion` (pentru student) si `sendAkyCourseQuestionProfesor` (pentru profesori). 
- Ele ascund complexitatea payload-ului care necesita atat stringul intrebarii cat si history-ul recent trimis catre `POST /api/student/cursuri/{courseId}/chat` (sau ruta de profesor). Reteaua returneaza un obiect cu `raspuns` si structura listei `surseFolosite`.

### 2.3 `professorCourses.js`
Cel mai masiv serviciu din aplicatie. Incapsuleaza toata complexitatea interactiunii cu cursurile (CRUD), preluand logica atat pentru Profesori (creatorii si gestionarii) cat si pentru studenti (consumatorii).
- **Listing Cursuri**: `listProfessorCourses()`, `listStudentCourses()`, `listStudentAvailableCourses()`, `listAdminCourses()`.
- **Enrollment / Withdraw**: Functii catre `/api/student/cursuri/{id}/inscriere` sau `.../retragere`.
- **Actiuni Administrative Curs (Profesor)**: 
  - Creare si editare curs: `createProfessorCourse()`, `updateProfessorCourse()`.
  - Gestionare Saptamani (Module): `createCourseWeek()`, `updateCourseWeek()`, `deleteCourseWeek()`.
  - Incarcare Materiale RAG/Documente: `uploadWeekDocument(weekId, payload)`, care instanțiază obiecte `FormData` native browser-ului pentru expedierea cu succes a fișierelor (cu multipart/form-data support transparent oferit de Axios).
  - Gestionare Status RAG Documente (Retry ingeste eronat): `retryDocumentIngest(documentId)`.
- **Progres Student**: `completeStudentWeek(weekId)` - Apel pentru marcarea unui modul din curs drept finalizat de catre student, ajutand calculul progresului (percentual) aratat pe tab-ul general.
- **Helpers Erori**: 
  - `getCourseErrorMessage(error, fallbackMessage)` preia automat un Axios error si o mapeaza pe baza structurii noastre cunoscute din backend (`error.response.data.eroare` sau `.message`). Daca gaseste un HTTP 400, 401, 403, 404, afiseaza explicit text pe intelesul UI-ului.
  - `getCourseFieldErrors(error)`: preia cheile si field-urile invalide trimise din ControllerAdvice de la backend pentru formulare invalide.

## 3. Tratarea Erorilor in UI
Nu exista o decuplare masiva intre un serviciu `try/catch` din `lib` si pagina; paginile React au grija sa infasoare aceste apeluri lib asincrone (`await function_from_lib`) cu constructii try-catch pentru a popula direct elementul generic UI `<Alert variant="destructive">` in caz de esec. Acest design permite UI-ului specific sa pastreze responsabilitatea afisarii unei notificari (sau field-errors direct langa inputuri), mentinand functiile API strict pentru comunicarea de date si translatie curata.
