# Pagini (Pages)

Sistemul Akadion randeaza vizual continutul prin fisiere denumite "Pages" (situate in `src/pages/` sau definite direct in `src/App.jsx` in cazul flow-urilor de autentificare critice). Toate paginile destinate utilizatorilor stabili invelesc interfata intr-o componenta `<AppShell>`.

---

## 1. Pagini cu Flow de Acces (definite in `App.jsx`)

Acestea nu au un meniu lateral sau meniu global. Rolul lor este pre-onboarding sau admin intens.

### `CompleteProfilePage`
* **Scop**: Formularul unde un utilizator cu rol necunoscut ajunge obligatoriu dupa inregistrarea prin Keycloak (pentru a furniza Facultatea, Rolul Dorit, si Nume/Prenume).
* **Accesibilitate**: Doar utilizatorii cu `stareCont == 'INCOMPLET'`.
* **Interactiuni / Logica**:
  * Un wizard (stepper visual) de forma "Cont (finalizat) -> Profil (curent)".
  * Formular care leaga state local (React `useState`) pe campurile `nume`, `prenume`, `facultate`, `rolDorit`. Rolurile sunt selectabile ca badge-uri (Student/Profesor).
  * Odata submise datele, se trimit la `POST /api/auth/complete-profile`. O componenta `<Alert>` atentioneaza permanent vizual utilizatorul "Contul necesita aprobare din partea echipei". 
  * Daca API-ul e succes, apeleaza fortat reinprospatarea starii globale (`refreshAuth()`), care in consecinta (deorece userul a avansat automat pe backend la starea PENDING) il muta automat cu react-router-ul la pagina de Asteptare-Aprobare.

### `AdminUsersPage`
* **Scop**: Panoul in care Adminii pot vizualiza, sorta si efectua actiuni administrative (accept/reject, activate/deactivate) asupra tututor utilizatorilor.
* **Accesibilitate**: Doar utilizatorii activi cu rol `ADMIN`.
* **Interactiuni**:
  * Tab-uri de statii: `ToÈ›i, ÃŽn aÈ™teptare, Activi, Inactivi, RespinÈ™i`. Prin selectarea unui filtru, schimba `searchParams` din URL (`?stare=PENDING`), garantand ca daca dai refresh esti inca acolo.
  * Navigare paginata (5 rezultate pe pagina - decizie complet executata intern, in memorie, cu `.slice()` pe frontend bazat pe setul preluat HTTP dintr-o data in faza de mount).
  * Butoanele `AprobÄƒ/Respinge/DezactiveazÄƒ` apeleaza `/api/admin/users/:id/:action`. Fiecare click este cerut ca fiind validat ("Confirmi respingerea?"). 
  * La confirmarea oricarei actiuni, starea cererilor re-cheama `/api/admin/users?stare=ALL` pentru a se re-sincroniza cu DB-ul.

---

## 2. Pagini de Business (definite in `src/pages/`)

### `DashboardPage.jsx`
* **Scop**: Punctul de intrare (Homepage) pentru toata lumea conectata. Arata stadiul general in Akadion (informatiile masive - widget-uri).
* **Accesibilitate**: Orice user (Student/Profesor/Admin) ACTIV.
* **Logica**:
  * **Admin**: Vede un `<Card>` urias de "Admin Overview" apeland rapid `/api/admin/stats` pentru a afisa contoare pe utilizatori (activi vs inactivi) si numar de cursuri (active vs inactive).
  * **Profesor**: Vede statistici simple (Curricule publicate, cursuri tinute). Ii randeaza un tabel/lista scurt a Cursurilor pe care el singur le gestioneaza prin apel din `listProfessorCourses()`. Ii ofera buton direct "CreeazÄƒ curs nou" (care il arunca la `/courses/new`).
  * **Student**: Incearca sa faca `listStudentAvailableCourses()`. Aceasta decizie e centrata pe viziunea Open-Elective: un student intra si pe dashboard vede absolut ORICE curs disponibil publicat pe platforma (daca nu este deja inscris la el). Cursurile sunt afisate intr-un grid modern de tip Bento.

### `CoursesPage.jsx`
* **Scop**: Pagina principala pentru Student pentru a naviga prin "Cursurile Mele". 
* **Logica**:
  * Face request pentru `listStudentCourses()`.
  * Afiseaza doar Carduri pentru cursurile INSCRISE. Ofera un progres vizual (bara de progres).
  * Click pe un Card trimite utilizatorul in ruta de detaliu `CourseDetailPage.jsx`.

### `CourseDetailPage.jsx`
* **Scop**: Pagina inima a invatarii / predarii. Pagina dinamica, cu aceeasi ruta (`/courses/:id`), dar se transforma radical daca o citeste un STUDENT sau daca o citeste un PROFESOR.
* **Date Importante**: Apeleaza atat cursul in sine (nume, stare), cat si saptamanile `listCourseWeeks`, profersorul titular `getCourseProfessor`, documentele `listWeekDocuments` pentru FIECARE saptamana.
* **Flux Profesor**:
  * Are switch explicit pentru a Inchide (Ascunde cursul) sau Deschide.
  * Isi poate accesa tab-ul cu Toti Studentii inrolati.
  * Fiecare Saptamana poate fi editata inline sau stearsa.
  * **Modul PDF Ingest**: Apare buton "Incarca Material Saptamanal". Lanseaza API care trimite fisierul si lanseaza asincron engine-ul RAG (Python). Daca MinIO-ul s-a descarcat dar Python da rateu, documentul randeaza (doar prof-ului) o alerta "Eroare Indexare: Retry Ingest". Aceasta permite re-declansarea unui API catre FastAPI din backend Java, complet invizibila userului dar esentiala curateniei platformei RAG.
* **Flux Student**:
  * Vede doar ce e public. Poate derula PDF-uri apasand butoanele `Vizualizare`.
  * Poate bifa (check) explicit o saptamana ca finalizata (`completeStudentWeek(weekId)`), iar butonul se face verde. De aici isi ia pagina de Dashboard numaratoarea si Progress Bar-ul procentajul de finalizare per curs.
  * Poate chema explicit sa renunte la curs ("Retrage-te") prin confirm prompt.

### `NewCoursePage.jsx`
* **Scop**: Wizard pentru Profesor (sau Admin) in vederea deschiderii unui curs complet nou de la 0.
* **Logica**:
  * Formular cu inputuri `denumire`, `descriere` si pick-up de data nativ HTML (type="date") pentru Start Date / Saptamana Unu.
  * Functie principala: `handleSubmit` care impinge request payload (`createProfessorCourse`) spre Spring. Se navigheaza imediat (`useNavigate`) inapoi spre pagina proaspat creata (`/courses/{response.data.id}`) ca el sa poata adauga direct prima lectie (saptamana 1) material.

### `ProfilePage.jsx`
* **Scop**: Editarea setarilor individuale (ex: Date standard, Email).
* **Logica**:
  * Desparte datele simple (Nume / Facultate) pe care le trimite prin standard API la `updateMyProfile()` actualizand tot in Frontend (`refreshAuth()`), fata de actiunile mari - ex: Update Email (`updateMyEmail()`).
  * Include sectiunea de schimbare email. Cerinta API Zero-Trust dicteaza ca formularul Frontend nu ar trebui decat sa propuna "trimite noul mail" - apoi frontend afiseaza Toast "Mergi in inbox-ul nou ca sa re-verifici OIDC".
  * Nu are camp de parola nativ - Parola se apasa un Buton "Reseteaza Parola prin Link de Email" (`requestMyPasswordReset()`) - iar React afiseaza un Pop-up Confirm. O metoda foarte sigura cu interactiune Frontend decuplata.
