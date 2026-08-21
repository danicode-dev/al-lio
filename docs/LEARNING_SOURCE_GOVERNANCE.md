# Gobierno de fuentes formativas

## Alcance

El catálogo de competencias contiene únicamente vídeos individuales en español. Una competencia puede publicarse solo cuando dispone de al menos un recurso aprobado. La etiqueta `Esencial AL-LIO` describe la selección editorial de la plataforma y no sustituye el currículo oficial del ciclo.

## Criterios de aceptación

- El vídeo enseña de forma directa la competencia a la que se asocia.
- El título, el canal y el vídeo están disponibles y coinciden con el catálogo.
- El contenido está en español y puede seguirse sin adquirir otro producto.
- Se excluyen noticias generales, entretenimiento, promesas económicas, contenido sensacionalista y vídeos cuyo encaje dependa únicamente de palabras clave.
- En salud y primeros auxilios se priorizan entidades reconocibles y se indica que el vídeo no sustituye formación práctica acreditada.
- Las sesiones deportivas de ejemplo se presentan como material de observación y análisis, no como acreditación profesional.

## Revisión

1. Ejecutar `npm run validate:learning-competencies` antes de importar.
2. Ejecutar `npm run validate:learning-sources` con acceso a Internet para confirmar disponibilidad y canal.
3. Revisar manualmente introducción, estructura, idioma, llamadas comerciales y encaje de cada recurso nuevo.
4. Importar mediante `npm run import:learning-competencies`; el proceso es transaccional e inactiva recursos retirados.
5. Repetir la revisión editorial cada trimestre o cuando un alumno reporte un recurso.

## Retirada inmediata

Un recurso se retira si deja de estar disponible, cambia de canal, pasa a otro idioma, contiene afirmaciones peligrosas o deja de enseñar la competencia asignada. Ante una duda editorial se desactiva primero y se busca sustituto después.
