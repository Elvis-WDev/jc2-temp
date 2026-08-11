-- Elimina media_assets.public_url.
--
-- La columna nunca se rellenaba ni se leia. Las URLs publicas se construyen en el
-- presenter a partir del id del archivo, que es lo que ya hacen todos los endpoints.
-- Mantener la misma informacion en una columna la condena a desincronizarse en cuanto
-- cambie PUBLIC_BASE_URL, y a que alguien confie en un valor obsoleto.
ALTER TABLE "media_assets" DROP COLUMN IF EXISTS "public_url";
