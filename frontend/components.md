# Componente Reutilizabile (React Components)

Majoritatea logicilor ce se repeta in interfata au fost sparte in mici componente specializate localizate in folderul `src/components`.

## 1. Baza: Generic UI Components (Arhitectura shadcn/ui)

In folderul `src/components/ui/` gasim formele elementare ale aplicatiei. Acestea nu poseda "business logic", nu fac call-uri de retea, ci primesc simplu "props" clasice de React (`children`, `className`, `variant`, `disabled` etc). 
Sunt derivate folosind biblioteca de utilitare `class-variance-authority` (cva) pentru a genera rapid variante de culori Tailwind.

* **Exemple Importante**:
  * **`<Button>`**: Element de baza. Accepta parametri de `variant` (`default`, `outline`, `destructive`, `ghost`) si se va re-randa automat cu clase Tailwind specifice starii sale.
  * **`<Card>`**: Ofera un container clar marginit si umbrit, divizat structural in subcomponente care pot fi apelate ca piese de lego (`<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<CardFooter>`).
  * **`<Alert>`**: Notificare colorata, de obicei apelata cand apare o eroare de sistem (prin `variant="destructive"` care face backgroundul rosu).
  * **`<Input>`, `<Label>`, `<Select>`**: Invelisuri pentru field-uri HTML clasice, restilizate modern.

_Nota: Acestea nu fac obiectul analizei detaliate conform constrangerilor curente (focus doar pe logica)._

## 2. The AppShell (`src/components/AppShell.jsx`)

`<AppShell>` este "scoarta" aplicatiei - layout-ul global utilizat de TOATE paginile autentificate (si active). 
Se ingrijeste ca interfata (navbar-ul) sa nu trebuiasca sa fie replicata in cod pe fiecare View.

* **Purpose (Scop)**:
  - Defineste antetul vizibil pe toate paginile (Sticky Header).
  - Controleaza navigarea orizontala intre sectiuni.
  - Ofera meniul drop-down cu numele/initialele utilizatorului pentru Acces Profil & Logout.
* **Unde este folosit**: 
  - Toate fisierele din `src/pages/` il folosesc pentru a inveli content-ul (`return <AppShell title="Panou"> ... </AppShell>`).
* **Props Importante**:
  - `title`, `description`, `eyebrow` (text sublinier deasupra titlului mare).
  - `heroClassName`, `actions` (elemente de tip buton care se plaseaza in dreapta header-ului mare specific paginii).
  - `sideContent` (folosit pentru a randa grid-uri sau sidebar-uri, ex: listare studenti la un curs pe cand materia sta in main content).
* **Logica interna & Navigatie**:
  - Detine componenta in-file `CourseTabsNav` care extrage TOATE cursurile la care un user e atasat (prin `listStudentCourses` sau `listProfessorCourses`) si deseneaza tab-uri navigabile orizontal direct din Header. Mentine `courseThemes` local, un dictionar intre cursurile afisate si tematica lor cromatica setata anterior, pentru ca butoanele nav-ului sa isi schimbe nuanta cand te muti de pe un curs pe altul.
  - Gestioneaza inchiderea deschiderea `mobile menu` (Hamburger Button pe ecrane mici) sau dropdown-ului contului (`accountOpen` state).

## 3. Widget-ul de Inteligenta Artificiala: `<AkyChatWidget>` (`src/components/chat/AkyChatWidget.jsx`)

Element esential de business logic. Este bula interactiva (Floating Action Button) persistenta pe coltul din dreapta-jos.

* **Purpose (Scop)**:
  - Ofera asistentul RAG in context (stie pe ce curs esti). Daca nu esti pe o pagina de curs, widgetul intra in "Mod Global" unde te obliga sa alegi un curs din select box-ul intern pentru a directiona intrebarea catre Vector Database-ul corect pe Backend.
* **Unde este folosit**:
  - Instantiat de cele mai multe ori global prin App (sau pe o pagina specifica unui curs, unde ii se transfera automat contextul cursului in props).
* **Props Importante**:
  - `courseId` (Id-ul cursului activ curent din URL. Daca e `null`, widgetul isi incarca dropdown-ul de cursuri din `lib/professorCourses.js`).
  - `courseTitle` (Numele cursului - doar de design).
  - `enabled` (Daca chat-ul permite intrebari).
* **Interactiuni / Logica**:
  - **Conversatia (Chat History)**: Stocheaza in memoria React-ului `const [messages, setMessages]`. Cand trimiti o intrebare (prin `<Input>`), ia continutul curent si un istoric trunchiat de (ultimele 10 mesaje) si le expediaza la `sendAkyCourseQuestion` catre backend RAG API.
  - **Raspunsuri si Referinte**: Asteapta ca serverul sa returneze atat raspunsul text cat si "Sursele Folosite". Daca serverul RAG a detectat pdf-ul din care s-a insipirat, Aky va randa pe interfata un badge cu numele fisierului sursa sub mesaje (folosind array-ul `surseFolosite`).
  - **Theme Picker**: Un feature interesant implementat complet izolat aici: Permite user-ului sa dea click pe iconita "Paleta" si sa salveze o culoare (ex: *Dracula*, *Caramel*) in **localStorage** (via o cheie combinata cu id-ul utilizatorului `akadion:aky-theme:{email}`). Aceasta tema se aplica exclusiv pe interfata plutitoare a widget-ului (header-ul sau, butonul de trimitere). Restul componentelor din aplicatie (cum ar fi Navbar-ul sau cursul in sine) isi gestioneaza propria tematica independent de acest widget.
  - **Error Handling Specializat**: Recunoaste 404 de la API ca "Serviciul Python FastAPI/RAG e oprit si Backendul l-a evitat", sau 429 ca "Prea multe requests in Rate-Limiter" si afiseaza mesaje adecvate in locul unei simple erori. Auto-scroll-ul listei de mesaje se face mereu pe ultimul mesaj prin `.scrollIntoView()` via ref pe obiectul `messagesEndRef`.
