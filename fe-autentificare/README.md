# AKADION Keycloak Theme

Tema nativă Keycloak se află în `keycloak-theme/university-theme`.

## Instalare

1. Rulează `npm install`.
2. Generează CSS-ul cu `npm run build:theme-css`.
3. Pentru rebuild automat folosește `npm run watch:theme-css`.

## Build și deploy

- Build CSS: `npm run build:theme-css`
- Deploy exact în folderul de teme Keycloak: `npm run deploy:keycloak-theme -- "C:\keycloak-26.7.0\themes"`

Scriptul copiază exact `keycloak-theme/university-theme` în `C:\keycloak-26.7.0\themes\university-theme`.

Calea finală obligatorie este:

`C:\keycloak-26.7.0\themes\university-theme\login\theme.properties`

## Pornire Keycloak fără cache

Pentru dezvoltare, pornește Keycloak cu:

`C:\keycloak-26.7.0\bin\kc.bat start-dev --spi-theme-cache-themes=false --spi-theme-cache-templates=false --spi-theme-static-max-age=-1`

După fiecare redeploy folosește `Ctrl + F5` în browser.

## Activarea temei

1. Deschide Keycloak Admin Console.
2. Intră în `Realm Settings`.
3. Deschide tabul `Themes`.
4. Setează `Login Theme` la `university-theme`.
5. Salvează și reîncarcă pagina de autentificare.

## Atribute User Profile necesare

Configurează manual în Keycloak User Profile următoarele atribute:

- `requestedRole`
- `faculty`

Recomandări pentru ambele:

- `visible` și `editable` în contextul `registration`
- `required` dacă vrei să fie obligatorii la înregistrare
- permisiuni de view/edit pentru utilizator în fluxul de înregistrare

Valori permise pentru `requestedRole`:

- `student`
- `professor`

Tema păstrează `requestedRole` și `faculty` ca atribute User Profile native. Nu transformă `requestedRole` în realm role.

## Note funcționale

- Rolul `admin` nu trebuie expus în formularul de înregistrare.
- Formularul salvează doar atributul `requestedRole`; nu acordă realm roles.
- Conturile noi pot necesita aprobare administrativă, în funcție de fluxul configurat în proiect.
- Autentificarea, resetarea parolei, validările, hidden fields, CSRF și redirecturile rămân gestionate nativ de Keycloak.
