-- =====================================================================
-- Contraseña común 123456 para los usuarios de PRUEBA (etapa de testing).
-- Decisión del 30/10/2026: el ingreso muestra un botón por usuario de
-- prueba y entra con esta clave (src/lib/usuarios-prueba.ts).
--
-- Solo toca las cuentas marcadas con app_metadata.prueba = true: nunca
-- direccionia@ ni otra cuenta real. Se aplica después de
-- 03_usuarios_prueba.sql. Si se vuelven a rotar las contraseñas con
-- scripts/claves-prueba.ts, el acceso con un clic deja de funcionar.
--
-- Antes de producción: ACCESO_PRUEBA=0 en Vercel y borrar los usuarios de
-- prueba (ver 03_usuarios_prueba.sql).
-- =====================================================================

update auth.users
   set encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
       updated_at = now()
 where raw_app_meta_data ->> 'prueba' = 'true';

-- Comprobación: tienen que ser 11 (los 10 del acceso rápido y admin@).
select count(*) as usuarios_de_prueba_con_clave_nueva
  from auth.users
 where raw_app_meta_data ->> 'prueba' = 'true'
   and encrypted_password = extensions.crypt('123456', encrypted_password);
