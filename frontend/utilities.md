# Utilitare (Utilities)

Sectiunea de utilitare mici care rezolva functii izolate si pure, menite sa reduca repetitia codului de configurare. Acestea se regasesc de obicei in directorul `src/lib`.

## 1. Merging de Clase Tailwind (`src/lib/utils.js`)

Pentru a asigura rezolvarea corecta a suprapunerilor intre clasele de Tailwind CSS transmise ca stringuri (fara a rupe stilizarea), proiectul foloseste `clsx` si `tailwind-merge` prin functia ajutatoare standard de ecosistemul Radix UI / Shadcn.

* **Functia `cn(...inputs)`**: 
  - Primeste oricate argumete tip string sau object-array continand clase Tailwind (ex: `"text-white", condition ? "bg-red" : "bg-blue"`).
  - Foloseste `clsx()` pentru unificare intr-un singur string, si apoi `twMerge()` care trunchiaza inteligent duplicarile conflictuale de padding, margini sau culori, pastrand prioritatea celor din urma declarate.
  - Ofera curatenie la declararea Props de pe componente UI.

## 2. Gestiunea Temelor Cursului (`src/lib/courseThemes.js`)

Datorita caracteristicii open-elective, cursurile au identitati proprii (teme cromatice selectabile) care se reflecta masiv in tab-urile din Navbar (in `AppShell`) cat si in widget-ul de chat (`AkyChatWidget`).
Pentru a extrage hard-code-ul de culori HEX sau clase tailwind complexe din JSX-ul paginilor, logica sta incapsulata intr-un JS object map nativ.

* **Functii si Logica**:
  * **`COURSE_THEMES`**: Constanta ce defineste obiecte de culori predefinite (ex: `"ocean-blue", "caramel", "dracula", "forester"`). Contine mapari complete de stringuri tailwind gata de aplicat in className: `btnPrimaryBg`, `badge`, `swatch`, `text`, si setarile tab-urilor.
  * **`DEFAULT_COURSE_THEME`**: Culoarea implicita globala (ex: `"akadion"` / albastru marin pastel).
  * **`getCourseTheme(themeKey)`**: Functie sigura care intoarce tema ceruta. Daca key-ul nu exista in vector (ex: incorect cacheuit local), va apela la fallback constant `COURSE_THEMES[0]`.
  * **`getThemeUserKey(user)`**: Ajuta ca storage-ul sa nu fure preferinta unui user catre alt user daca acestia se conecteaza succesiv de pe acelasi browser, utilizand o sintaxa ce extrage email-ul/id-ul userului ca prefix pentru LocalStorage. Aceasta ajuta AkyChatWidget sa citeasca setarea doar aferenta vizitatorului curent din client.
