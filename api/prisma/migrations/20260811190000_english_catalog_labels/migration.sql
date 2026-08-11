-- Las etiquetas de los catalogos, en el idioma de la interfaz.
--
-- La plataforma se sembro en castellano y toda la interfaz esta ahora en ingles. Las
-- etiquetas de los catalogos son datos, no codigo: viven en la base y por eso no las
-- alcanza ningun cambio en el frontend. Sin esto, un despliegue nuevo volveria a
-- mostrar "Congreso" bajo el titulo de un congreso escrito en ingles.
--
-- Los estados academicos se sembraron dentro de `20260811100000_academic_status_table`,
-- que ya esta aplicada: no se toca una migracion aplicada, se anade esta.
--
-- **Solo se renombra lo que sigue teniendo el valor sembrado.** Si el titular ya lo
-- reescribio a su manera, su texto manda y esta migracion lo deja como esta. Por eso
-- cada UPDATE lleva su `AND label = '...'`.
--
-- CUIDADO al regenerar con `prisma migrate diff`: propone borrar las claves foraneas
-- compuestas de RN-006, el indice unico de departamentos y el de busqueda. Nunca se
-- incluyen esas lineas.

BEGIN;

-- Estados academicos ---------------------------------------------------------
UPDATE academic_statuses SET label = 'Forthcoming'          WHERE code = 'forthcoming'         AND label = 'En prensa';
UPDATE academic_statuses SET label = 'Revise and Resubmit'  WHERE code = 'revise_and_resubmit' AND label = 'Revisar y reenviar';
UPDATE academic_statuses SET label = 'Inactive'             WHERE code = 'inactive'            AND label = 'Inactivo';

-- Enlaces de un trabajo ------------------------------------------------------
UPDATE catalog_terms SET label = 'Publisher'              WHERE catalog = 'work_link' AND code = 'publisher'     AND label = 'Editorial';
UPDATE catalog_terms SET label = 'External PDF'           WHERE catalog = 'work_link' AND code = 'pdf_external'  AND label = 'PDF externo';
UPDATE catalog_terms SET label = 'Code'                   WHERE catalog = 'work_link' AND code = 'code'          AND label = 'Codigo';
UPDATE catalog_terms SET label = 'Data'                   WHERE catalog = 'work_link' AND code = 'dataset'       AND label = 'Datos';
UPDATE catalog_terms SET label = 'Replication material'   WHERE catalog = 'work_link' AND code = 'replication'   AND label = 'Material de replicacion';
UPDATE catalog_terms SET label = 'Slides'                 WHERE catalog = 'work_link' AND code = 'slides'        AND label = 'Transparencias';
UPDATE catalog_terms SET label = 'Project'                WHERE catalog = 'work_link' AND code = 'project'       AND label = 'Proyecto';
UPDATE catalog_terms SET label = 'Supplementary material' WHERE catalog = 'work_link' AND code = 'supplementary' AND label = 'Material adicional';
UPDATE catalog_terms SET label = 'Other'                  WHERE catalog = 'work_link' AND code = 'other'         AND label = 'Otro';

-- Perfiles de una persona ----------------------------------------------------
UPDATE catalog_terms SET label = 'Personal website' WHERE catalog = 'person_link' AND code = 'website' AND label = 'Web personal';
UPDATE catalog_terms SET label = 'Other'            WHERE catalog = 'person_link' AND code = 'otro'    AND label = 'Otro';

-- Archivos de un trabajo -----------------------------------------------------
UPDATE catalog_terms SET label = 'Paper (PDF)'            WHERE catalog = 'work_file' AND code = 'paper_pdf'    AND label = 'Articulo (PDF)';
UPDATE catalog_terms SET label = 'Appendix'               WHERE catalog = 'work_file' AND code = 'appendix'     AND label = 'Apendice';
UPDATE catalog_terms SET label = 'Supplementary material' WHERE catalog = 'work_file' AND code = 'supplement'   AND label = 'Material adicional';
UPDATE catalog_terms SET label = 'Code'                   WHERE catalog = 'work_file' AND code = 'code_archive' AND label = 'Codigo';
UPDATE catalog_terms SET label = 'Data'                   WHERE catalog = 'work_file' AND code = 'data_archive' AND label = 'Datos';
UPDATE catalog_terms SET label = 'Slides'                 WHERE catalog = 'work_file' AND code = 'slides'       AND label = 'Transparencias';
UPDATE catalog_terms SET label = 'Figure'                 WHERE catalog = 'work_file' AND code = 'figure'       AND label = 'Figura';
UPDATE catalog_terms SET label = 'Other'                  WHERE catalog = 'work_file' AND code = 'other'        AND label = 'Otro';

-- Materiales de curso --------------------------------------------------------
UPDATE catalog_terms SET label = 'Syllabus'    WHERE catalog = 'course_material' AND code = 'syllabus'    AND label = 'Programa';
UPDATE catalog_terms SET label = 'Slides'      WHERE catalog = 'course_material' AND code = 'slides'      AND label = 'Transparencias';
UPDATE catalog_terms SET label = 'Problem set' WHERE catalog = 'course_material' AND code = 'problem_set' AND label = 'Ejercicios';
UPDATE catalog_terms SET label = 'Reading'     WHERE catalog = 'course_material' AND code = 'reading'     AND label = 'Lecturas';
UPDATE catalog_terms SET label = 'Exam'        WHERE catalog = 'course_material' AND code = 'exam'        AND label = 'Examen';
UPDATE catalog_terms SET label = 'Notes'       WHERE catalog = 'course_material' AND code = 'notes'       AND label = 'Apuntes';
UPDATE catalog_terms SET label = 'Other'       WHERE catalog = 'course_material' AND code = 'otro'        AND label = 'Otro';

-- Tipos de evento ------------------------------------------------------------
UPDATE catalog_terms SET label = 'Seminar'         WHERE catalog = 'event' AND code = 'seminar'    AND label = 'Seminario';
UPDATE catalog_terms SET label = 'Conference'      WHERE catalog = 'event' AND code = 'conference' AND label = 'Congreso';
UPDATE catalog_terms SET label = 'Workshop'        WHERE catalog = 'event' AND code = 'workshop'   AND label = 'Taller';
UPDATE catalog_terms SET label = 'Lecture'         WHERE catalog = 'event' AND code = 'lecture'    AND label = 'Conferencia';
UPDATE catalog_terms SET label = 'Thesis defence'  WHERE catalog = 'event' AND code = 'defence'    AND label = 'Defensa de tesis';
UPDATE catalog_terms SET label = 'Call for papers' WHERE catalog = 'event' AND code = 'call'       AND label = 'Convocatoria';
UPDATE catalog_terms SET label = 'Other'           WHERE catalog = 'event' AND code = 'other'      AND label = 'Otro';

-- Tipos de publicacion -------------------------------------------------------
UPDATE catalog_terms SET label = 'Journal'               WHERE catalog = 'venue' AND code = 'journal'              AND label = 'Revista';
UPDATE catalog_terms SET label = 'Publisher'             WHERE catalog = 'venue' AND code = 'publisher'            AND label = 'Editorial';
UPDATE catalog_terms SET label = 'Conference'            WHERE catalog = 'venue' AND code = 'conference'           AND label = 'Congreso';
UPDATE catalog_terms SET label = 'Working paper series'  WHERE catalog = 'venue' AND code = 'working_paper_series' AND label = 'Serie de working papers';
UPDATE catalog_terms SET label = 'Repository'            WHERE catalog = 'venue' AND code = 'repository'           AND label = 'Repositorio';
UPDATE catalog_terms SET label = 'Other'                 WHERE catalog = 'venue' AND code = 'other'                AND label = 'Otro';

-- Niveles de curso. Son los unicos con descripcion sembrada, y salen en la web
-- publica como entradilla de cada grupo de cursos.
UPDATE catalog_terms
SET label = 'Graduate',
    description = 'Advanced courses for master''s and doctoral students, focused on contemporary methods and theoretical frontiers.'
WHERE catalog = 'course_level' AND code = 'graduate' AND label = 'Seminarios de posgrado';

UPDATE catalog_terms
SET label = 'Undergraduate',
    description = 'Core courses that build the analytical frameworks for understanding market dynamics.'
WHERE catalog = 'course_level' AND code = 'undergraduate' AND label = 'Grado';

UPDATE catalog_terms SET label = 'Doctoral'            WHERE catalog = 'course_level' AND code = 'doctoral'  AND label = 'Doctorado';
UPDATE catalog_terms SET label = 'Executive education' WHERE catalog = 'course_level' AND code = 'executive' AND label = 'Formacion continua';
UPDATE catalog_terms SET label = 'Other'               WHERE catalog = 'course_level' AND code = 'other'     AND label = 'Otro';

-- Tipos de afiliacion --------------------------------------------------------
UPDATE catalog_terms SET label = 'Permanent' WHERE catalog = 'affiliation' AND code = 'permanent' AND label = 'Permanente';
UPDATE catalog_terms SET label = 'Visiting'  WHERE catalog = 'affiliation' AND code = 'visiting'  AND label = 'Visitante';
UPDATE catalog_terms SET label = 'Honorary'  WHERE catalog = 'affiliation' AND code = 'honorary'  AND label = 'Honorario';
UPDATE catalog_terms SET label = 'Adjunct'   WHERE catalog = 'affiliation' AND code = 'adjunct'   AND label = 'Asociado';
UPDATE catalog_terms SET label = 'Emeritus'  WHERE catalog = 'affiliation' AND code = 'emeritus'  AND label = 'Emerito';
UPDATE catalog_terms SET label = 'Research'  WHERE catalog = 'affiliation' AND code = 'research'  AND label = 'Investigador';
UPDATE catalog_terms SET label = 'Other'     WHERE catalog = 'affiliation' AND code = 'other'     AND label = 'Otro';

-- La pagina de eventos se sembro con el titulo en castellano.
UPDATE page_content SET page_title = 'Events' WHERE page_key = 'events' AND page_title = 'Eventos';

COMMIT;
