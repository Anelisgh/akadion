-- Verificari non-distructive pentru configuratia locala Akadion.

SELECT id, denumire
FROM roluri
ORDER BY id;

SELECT id, denumire
FROM stari_cont
ORDER BY id;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_user'
ORDER BY ordinal_position;

SELECT id, id_keycloak, id_rol, id_stare_cont, mail, nume, prenume
FROM app_user
WHERE id_rol = 1
ORDER BY id;

-- Verifica manual in Keycloak ca id_keycloak pentru adminul dorit coincide cu UUID-ul userului admin din realmul Akadion.
