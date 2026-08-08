# Task pentru agent AI: Infinite Scroll în `AkyChatWidget` — Listă Conversații + Istoric Mesaje

## Context

Backend-ul a fost (sau va fi) modificat să suporte paginare pe două rute existente, fără să le schimbe path-ul:

```
GET /api/.../cursuri/{cursId}/... conversatii ?page=0&size=20
GET /api/conversatii/{id}/mesaje ?inainteDe={idMesaj}&limit=20
```

- Lista de conversații: fără parametri = primul batch. Răspuns: `{ continut, areUrmatoarea }`.
- Istoric mesaje: fără `inainteDe` = ultimele mesaje (comportamentul actual). Cu `inainteDe` = batch-ul următor, mai vechi. Răspuns: `{ mesaje (ordonate crescator), areMaiMulte, celMaiVechiIdIncarcat }`.

Sunt **două tipare diferite de scroll**, nu le trata la fel:

1. **Lista de conversații** (dropdown/panel de selecție) → scroll **spre jos** → încarci pagina următoare → **adaugi la coadă** (append).
2. **Istoricul mesajelor unei conversații deschise** → scroll **spre sus** → încarci batch-ul mai vechi → **adaugi la început** (prepend).

Prepend-ul e cel cu capcană tehnică, tratat separat mai jos.

## Pas 0 — Verificare obligatorie înainte de orice modificare

Nu presupune structura codului — verifică-o efectiv:

1. **Verifică structura reală a `AkyChatWidget`**: unde e randată lista de conversații (e componentă separată sau parte din același fișier?), ce state există deja (`messages`, eventual `conversations`), și cum arată exact bucla de randare a mesajelor.
2. **Verifică `aky.js`** (sau echivalent din `src/lib`) — ce funcții există azi (`sendAkyCourseQuestion` etc.), ce format de răspuns așteaptă, și confirmă exact numele/parametrii rutelor noi paginate din backend înainte să scrii apelurile.
3. **Verifică dacă există deja un `ref` pe containerul scrollabil de mesaje** (documentația menționează `messagesEndRef` folosit pentru auto-scroll la ultimul mesaj) — vezi cum interacționează cu ce urmează să adaugi, ca să nu intri în conflict cu auto-scroll-ul existent la mesaj nou.
4. **Verifică instanța Axios** (`axiosInstance.js`) — confirmă că suportă `params` standard pentru query string, nu presupune.
5. Nu presupune că există deja o componentă de listă conversații paginabilă — dacă nu există, raportează asta explicit înainte de a o construi de la zero.

## Obiectiv

### A. Lista de conversații — scroll spre jos, append

- La deschiderea listei: fetch primul batch (`page=0`).
- Listener de scroll pe containerul listei: când userul ajunge aproape de capătul de jos (prag ~100px), și dacă `areUrmatoarea === true` și nu e deja un fetch în curs, cere pagina următoare și **adaugă** rezultatele la finalul array-ului existent.
- State minim necesar: `conversatii`, `paginaCurenta`, `areUrmatoarea`, `seIncarcaMaiMulte`.

### B. Istoricul mesajelor — scroll spre sus, prepend (cu păstrarea poziției de scroll)

- La deschiderea unei conversații: fetch fără `inainteDe` (ultimele mesaje, comportament actual).
- Listener de scroll pe containerul de mesaje: când userul ajunge aproape de capătul de **sus** (prag ~100px) și `areMaiMulte === true` și nu e deja un fetch în curs, cere `inainteDe=celMaiVechiIdIncarcat` și **adaugă rezultatele la început**.

**Cerință tehnică obligatorie — evitarea "săriturii" de scroll:**
Când adaugi mesaje deasupra celor deja randate, browserul recalculează înălțimea containerului și userul e "aruncat" vizual în altă parte a listei dacă nu compensezi explicit. Pattern corect:

```javascript
const container = messagesContainerRef.current;
const scrollHeightInainte = container.scrollHeight;

// ... adaugi mesajele noi la inceputul array-ului (setMessages) ...

// dupa ce DOM-ul s-a actualizat (useLayoutEffect, NU useEffect obisnuit,
// ca sa ruleze inainte de urmatorul repaint vizibil userului)
useLayoutEffect(() => {
  const scrollHeightDupa = container.scrollHeight;
  container.scrollTop += (scrollHeightDupa - scrollHeightInainte);
}, [messages]);
```

Fără acest pas, userul vede lista "sărind" la fiecare load-more — e testabil vizual, nu doar teoretic, deci verifică manual la final.

## Ce există deja și NU trebuie modificat

- Logica de trimitere a unui mesaj nou (`sendAkyCourseQuestion` / echivalent profesor).
- Error handling existent (404 → "RAG oprit", 429 → rate limit).
- Auto-scroll la mesaj nou trimis/primit (`messagesEndRef`) — trebuie să coexiste cu load-more-ul de sus, nu să-l înlocuiască. Auto-scroll-ul la ultimul mesaj rămâne valabil doar când userul trimite/primește un mesaj nou, nu când face load-more în sus.
- Theme picker și `localStorage` pentru tema widget-ului.

## Modificări de făcut

1. Extinde `aky.js` (sau fișierul echivalent) cu funcții care acceptă parametrii de paginare și returnează batch-ul + flag-urile (`areUrmatoarea`/`areMaiMulte`).
2. În `AkyChatWidget`, adaugă state-urile de mai sus și listenerii de scroll, cu **debounce** (ex. 200ms) pe eventul de scroll, ca să nu declanșezi un fetch la fiecare pixel.
3. Adaugă un flag de loading (`seIncarcaMaiMulte`) care blochează fetch-uri suprapuse — dacă e deja `true`, orice alt trigger de scroll e ignorat până termină cel curent.
4. Un indicator vizual simplu (spinner mic sau text "Se încarcă...") în capătul spre care se face load-more, cât timp `seIncarcaMaiMulte === true`.

## Ce să nu faci

- Nu introduce librării de virtualizare a listei (ex. `react-window`, `react-virtualized`) doar pentru asta — volumul de mesaje randate simultan e mic, ar fi complexitate inutilă (încalcă KISS).
- Nu înlocui array-ul de mesaje existent la fiecare load-more — doar `prepend`/`append`, păstrează ce e deja încărcat.
- Nu declanșa fetch fără debounce pe evenimentul `onScroll` — evenimentul se declanșează foarte des, fără debounce faci request-uri redundante.
- Nu sparge auto-scroll-ul existent la mesaj nou — cele două comportamente de scroll (jos la mesaj nou, sus la load-more istoric) trebuie să coexiste fără să se calce reciproc.
- Nu folosi `localStorage`/`sessionStorage` pentru cache-uirea paginilor încărcate — starea rămâne în React state, cât ține sesiunea widget-ului deschis.

## Criterii de acceptare

1. La deschiderea unei conversații lungi, se văd doar ultimele mesaje inițial (nu tot istoricul dintr-o dată).
2. Scroll spre sus într-o conversație cu multe mesaje declanșează încărcarea batch-ului anterior, iar poziția vizuală a userului pe ecran **nu sare** — rămâne pe același mesaj pe care îl vedea înainte de load.
3. Când `areMaiMulte === false` (s-a ajuns la începutul conversației), scroll suplimentar spre sus nu mai declanșează niciun fetch.
4. Lista de conversații se completează progresiv la scroll spre jos, fără duplicate între batch-uri.
5. Trimiterea unui mesaj nou tot face auto-scroll la ultimul mesaj, indiferent de câte load-more-uri spre sus s-au făcut anterior în sesiunea curentă a widget-ului.
6. Niciun fetch dublu/suprapus nu pornește dacă userul scrolează rapid înainte-înapoi (verifică prin Network tab că nu apar cereri paralele redundante).
