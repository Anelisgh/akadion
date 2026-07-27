# Ghid de Migrare: Integrare Backend Modificat & Actualizare Frontend

Acest ghid conține pașii necesari pentru ca colegul tău să înlocuiască folderele de backend din proiectul său cu versiunea modificată de tine, să aplice migrările de bază de date și să-și actualizeze codul de frontend fără a întâmpina erori.

---

## Pasul 1: Salvarea (Backup) Proiectului Curent
Deoarece lucrați cu arhive ZIP și nu folosiți Git, colegul tău trebuie să creeze o arhivă `.zip` a întregului său proiect actual înainte de a face modificări. Acest lucru va servi ca punct de restaurare rapid în caz de probleme.

---

## Pasul 2: Înlocuirea Codului de Backend
Colegul tău trebuie să urmeze acești pași în structura sa de foldere backend (`proiect/src/main/java/com/example/akadion`):
1. **Ștergerea folderelor vechi:** Să șteargă complet directoarele `config`, `controller`, `dto`, `entity`, `exception`, `repository`, `security` și `service`.
2. **Copierea noilor foldere:** Să copieze aceste 8 directoare din folderul tău modificat (`akadion-backend-modificat/proiect/src/main/java/com/example/akadion`) în locația corespunzătoare din proiectul lui.

---

## Pasul 3: Copierea Migrării SQL (Flyway)
Pentru ca baza de date să fie sincronizată cu noile entități JPA (cum ar fi constrângerile de unicitate din tabela `parcursuri`):
* Colegul tău trebuie să copieze fișierul `V2__add_unique_constraint_parcursuri.sql` din directorul tău:
  `akadion-backend-modificat/proiect/src/main/resources/db/migration/`
  în folderul de resurse al proiectului său:
  `proiect/src/main/resources/db/migration/`.

---

## Pasul 4 (Opțional, dar Recomandat): Restaurarea Endpoint-urilor de Admin în Backend
Noul `AdminController` nu mai are metodele pentru vizualizarea detaliilor unui curs (săptămâni, documente, studenți înscriși). Totuși, serviciile din backend încă le suportă. 

Pentru a preveni erorile din pagina de detalii a Adminului în frontend, recomandăm ca după copierea fișierelor de backend, colegul tău (sau AI-ul lui) să modifice fișierul [AdminController.java](file:///C:/Users/Aneliss/Desktop/akadion-backend-modificat/proiect/src/main/java/com/example/akadion/controller/AdminController.java) astfel:

1. **Re-adaugă importurile și serviciile dependente:**
   ```java
   import com.example.akadion.service.SaptamanaService;
   import com.example.akadion.service.DocumentService;
   import com.example.akadion.dto.SaptamanaResponseDto;
   import com.example.akadion.dto.DocumentResponseDto;
   import com.example.akadion.dto.StudentCursDto;
   ```
2. **Re-adaugă câmpurile în clasa `AdminController` (Lombok `@RequiredArgsConstructor` le va include automat în constructor):**
   ```java
   private final SaptamanaService saptamanaService;
   private final DocumentService documentService;
   ```
3. **Re-adaugă cele 4 metode restaurate la finalul clasei:**
   ```java
   @GetMapping("/cursuri/{id}")
   public com.example.akadion.dto.CursResponseDto getCurs(@PathVariable Long id) {
       return cursService.getCursById(id, null, "ADMIN");
   }

   @GetMapping("/cursuri/{id}/saptamani")
   public List<SaptamanaResponseDto> listaSaptamani(@PathVariable Long id) {
       return saptamanaService.listaSaptamani(id, null, "ADMIN");
   }

   @GetMapping("/saptamani/{saptamanaId}/documente")
   public List<DocumentResponseDto> listaDocumente(@PathVariable Long saptamanaId) {
       return documentService.listaDocumente(saptamanaId, null, "ADMIN");
   }

   @GetMapping("/cursuri/{id}/studenti")
   public List<StudentCursDto> listaStudentiInscrisi(@PathVariable Long id) {
       return cursService.listaStudentiActivi(id, null, "ADMIN");
   }
   ```

---

## Pasul 5: Actualizarea Frontend-ului (folosind Prompt-ul AI)
Pentru a corecta automat toate erorile din frontend generate de modificarea API-ului, colegul tău poate trimite asistentului său AI promptul de mai jos.

---

# 🤖 PROMPT PENTRU AI-UL COLEGULUI TĂU
*Colegul tău poate copia textul de mai jos direct în fereastra de chat a asistentului său AI (de exemplu, Cursor, Copilot sau direct în Gemini).*

```text
Salut! Am actualizat backend-ul aplicației noastre Akadion la o versiune îmbunătățită care restructurează fluxul pentru studenti, adaugă progresul pe curs (finalizare săptămâni), retragerea din cursuri, statistici pentru dashboard-ul de admin și îmbunătățește securitatea. 

Din această cauză, contractul API s-a schimbat, iar frontend-ul curent va returna erori de tip 404 și câmpuri vide (undefined) pe paginile de Student, Admin și Profesor.

Te rog să analizezi și să actualizezi fișierele de frontend pentru a fi compatibile cu noul backend:

1. ACTUALIZEAZĂ RUTELE DIN SERVICII ('src/lib/professorCourses.js'):
   - În loc de "GET /api/student/cursuri" (listStudentCourses) care a fost șters:
     * Creează/modifică "GET /api/student/cursuri/mele" (listStudentCourses) pentru a lista cursurile la care studentul este deja înscris activ. Acest endpoint returnează o listă de CursInrolatResponseDto (id, denumire, profesorNume, profesorPrenume, procentajProgres).
     * Adaugă un nou endpoint "GET /api/student/cursuri/disponibile" (de ex. listStudentAvailableCourses) pentru a lista cursurile la care studentul se poate înscrie. Acesta returnează o listă de CursDisponibilResponseDto (id, denumire, descriere, profesorNume, profesorPrenume, dataInceput, nrSaptamani).
   - Șterge funcția getStudentCourse (ruta "GET /api/student/cursuri/{id}" a fost ștearsă din backend).
   - Modifică funcția enrollStudentCourse ("POST /api/student/cursuri/{id}/inscriere"): acum returnează void (doar statusul 200 OK), deci nu mai aștepta sau returna un obiect de tip Curs în corpul răspunsului.
   - În loc de "GET /api/student/cursuri/saptamani/{saptamanaId}/documente" (listStudentWeekDocuments), noua rută este "GET /api/student/saptamani/{saptamanaId}/documente".
   - Adaugă noile funcții/servicii API pentru student:
     * "POST /api/student/cursuri/{cursId}/retragere" -> Retragere student de la curs.
     * "POST /api/student/saptamani/{saptamanaId}/complete" -> Bifează o săptămână ca fiind parcursă.
     * "DELETE /api/student/saptamani/{saptamanaId}/complete" -> Debifează o săptămână parcursă.
     * "GET /api/student/cursuri/{cursId}/profesor" -> Detalii profesor pentru curs, returnează ProfesorDetaliiResponseDto (nume, prenume, mail, facultate).

2. ACTUALIZEAZĂ PAGINILE DIN FRONTEND:
   - În 'src/pages/CoursesPage.jsx':
     * Pentru tabul de cursuri la care studentul e înrolat, folosește datele din listStudentCourses() și mapează conform structurii CursInrolatResponseDto (numele profesorului este sub formă de "profesorNume" și "profesorPrenume", și avem procentajProgres).
     * Pentru tabul de cursuri disponibile la înscriere, apelează listStudentAvailableCourses() și mapează conform CursDisponibilResponseDto.
   - În 'src/pages/CourseDetailPage.jsx':
     * Pe vizualizarea de student, elimină apelul către getStudentCourse (ruta nu mai există). Informațiile de bază pot fi luate direct din starea paginii anterioare (CoursesPage) sau obținute la listarea cursurilor.
     * Tot în CourseDetailPage, pe modul profesor sau admin, actualizează afișarea tabelei de studenți înscriși (listaStudentiInscrisi/listaStudentiActivi). Noul DTO (StudentCursDto) folosește proprietatea "student.mail" în loc de "student.email" și conține opțional și "student.facultate". Actualizează afișarea din tabel să citească ".mail" în loc de ".email" ca să nu apară goale, și adaugă opțional coloana Facultate.
   - În 'src/pages/DashboardPage.jsx':
     * S-a adăugat un endpoint nou în backend pentru dashboard-ul de admin: "GET /api/admin/stats" care returnează statistici sub formă de DashboardStatsDto: { cursuriActive, cursuriInactive, utilizatoriActivi, utilizatoriPending }. Te rog să actualizezi pagina DashboardPage.jsx să poată prelua aceste date direct (pentru a evita calculele manuale).

Te rog să aplici aceste modificări pe fișierele menționate. Mulțumesc!
```
