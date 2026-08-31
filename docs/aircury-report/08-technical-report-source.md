# AL-LIO — fuente editorial de la memoria técnica

Documento de trabajo para la memoria técnica de **AL-LIO** presentada a
**Aircury Summer of Code 2026**. Contiene el texto narrativo aprobado para su
posterior maquetación, además de notas internas de trazabilidad que no deben
exportarse al PDF.

## Contrato editorial

- **Idioma de la memoria:** español.
- **Fecha de entrega:** 31 de agosto de 2026.
- **Formato final:** PDF, sin extensión predeterminada y sin contenido de
  relleno.
- **Versión descrita:** `aircury-2026-delivery`, commit
  `1e516ead8f69d60a263718c20d59b97c9618c97a`.
- **Repositorio canónico:** <https://github.com/danielgarciaortega-dev/al-lio>.
- **Servicio público:** <https://al-lio.app>.
- **Autor:** Daniel García Ortega.
- **Contacto público:** <hola@al-lio.app>.
- **Límite temporal de la evidencia:** 31 de agosto de 2026 a las 16:49:37
  CEST.

Las marcas **NOTA INTERNA — NO EXPORTAR AL PDF** pertenecen al control
editorial. No forman parte de la memoria. Tampoco se exportarán comandos,
consultas SQL, logs, rutas internas, matrices extensas de evidencias ni datos
privados.

---

# Texto exportable

## Portada — introducción breve

**AL-LIO** es un espacio digital privado para estudiantes de Formación
Profesional de Grado Superior. Reúne planificación personal, seguimiento del
aprendizaje y descubrimiento de información revisada en una experiencia
adaptada al ciclo formativo de cada estudiante.

Esta memoria describe el problema abordado, la solución entregada, su diseño
técnico, el proceso de desarrollo y validación, sus límites actuales y el plan
para mantener el servicio operativo y en evolución hasta, como mínimo, el 31
de agosto de 2027.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** portada respaldada por `DEL-001`,
> `DEL-002`, `VER-001`–`VER-004`, `OPS-002` y `PRD-001`. La composición final,
> autoría visible y enlaces corresponden a #323.

## 1. Síntesis ejecutiva

Los estudiantes de Formación Profesional reciben tareas, recursos de estudio,
convocatorias, eventos y noticias sectoriales a través de canales distintos.
El problema no es únicamente encontrar información, sino saber qué es
relevante para su titulación, si sigue vigente y cuál es el siguiente paso que
conviene realizar.

AL-LIO responde a esa fragmentación mediante un espacio web privado en
español. Después de seleccionar su ciclo y curso académico, el estudiante
accede a un panel personal desde el que puede organizar tareas y notas,
consultar competencias, utilizar recursos de aprendizaje, conservar su
progreso y descubrir contenidos relacionados con su perfil. El producto
soporta cinco ciclos: Desarrollo de Aplicaciones Web (DAW), Desarrollo de
Aplicaciones Multiplataforma (DAM), Administración y Finanzas (AF),
Acondicionamiento Físico (TSAF) y Marketing y Publicidad (MP).

La propuesta combina dos ámbitos que normalmente aparecen separados. Por un
lado, conserva información privada del estudiante —perfil, tareas, notas,
progreso y elementos guardados—. Por otro, incorpora información externa a
través de AL-LIO Radar, un servicio independiente que recopila fuentes
autorizadas, normaliza candidatos y exige revisión humana antes de entregar
contenido a la aplicación. La selección que ve el usuario se filtra en el
servidor según su ciclo; no depende de un algoritmo opaco de popularidad.

La versión descrita en esta memoria quedó congelada con una referencia pública
inmutable, superó la integración continua y fue desplegada en producción. En
la verificación final se confirmaron los principales recorridos de cuenta,
personalización, planificación y aprendizaje. La memoria también conserva los
límites observados: el consentimiento de Google Calendar quedó bloqueado por
el aviso de aplicación no verificada de Google, las noticias de producción
fallaban o presentaban contenido insuficiente, no se realizó una prueba móvil
en un dispositivo físico y todavía no existe un estudio formal con usuarios.

AL-LIO se publica con licencia MIT y se mantendrá operativo, con correcciones,
actualizaciones de seguridad y mejoras funcionales, hasta al menos el 31 de
agosto de 2027.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `PRD-001`–`PRD-018`, `ARC-001`,
> `GOV-001`, `GOV-002`, `QAL-001`, `QAL-002`, `VER-004`, `DEL-006` y
> `OPS-002`. Mantener las limitaciones en el resumen; no convertir la
> verificación parcial en un E2E completo.

## 2. Contexto, problema, usuarios y motivación personal

### 2.1 Contexto y problema

La Formación Profesional tiene una orientación práctica y una relación
directa con competencias, actividades, empresas y oportunidades del entorno.
Sin embargo, el estudiante suele gestionar esa realidad con herramientas
desconectadas: una aplicación para tareas, documentos o notas en otro lugar,
recursos de aprendizaje dispersos y fuentes externas que no siempre explican
su vigencia o relación con una titulación concreta.

Esta dispersión añade trabajo de coordinación. Antes de avanzar, el estudiante
debe localizar la información, comprobar si le corresponde, valorar su fuente
y decidir qué hacer con ella. AL-LIO concentra ese contexto y lo convierte en
acciones manejables, sin sustituir al centro educativo, al profesorado, al
currículo oficial ni a los organismos responsables de cada convocatoria.

### 2.2 Personas destinatarias

La audiencia principal son estudiantes de los cinco ciclos soportados. Cada
perfil mantiene un ciclo y un curso académico activos. Ese dato se utiliza de
forma consistente para mostrar competencias y contenido aplicable. DAW y DAM
comparten una agrupación de empresas del ámbito del desarrollo, pero conservan
sus propias competencias y reglas de contenido cuando la correspondencia debe
ser exacta.

El alcance es deliberado: AL-LIO no afirma cubrir toda la Formación
Profesional ni garantiza la misma cantidad de recursos para todos los ciclos.
La cobertura debe evaluarse por ciclo para que una cifra total no oculte
carencias de un grupo concreto.

### 2.3 Motivación personal

La motivación del proyecto es construir una herramienta útil y mantenible que
reduzca la fricción cotidiana de estudiantes que necesitan organizarse y
orientarse entre fuentes dispersas. El objetivo personal no es añadir otra
plataforma generalista, sino transformar un problema reconocible —no saber qué
información aplica ni cuál es el siguiente paso— en un flujo claro, privado y
adaptado a la realidad de cada ciclo.

Esa motivación también explica la decisión de publicar el proyecto como
software de código abierto: el trabajo puede inspeccionarse, aprenderse y
mejorarse, mientras el servicio continúa evolucionando más allá de la fecha
de entrega.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** problema y audiencia respaldados por
> `PRD-004`, `IMP-002` e `IMP-004`. La motivación personal es una propuesta
> editorial razonada, no un hecho extraído del código: requiere aprobación
> expresa de Daniel García Ortega antes de #323. Evitar ampliar el nombre de
> TSAF de forma distinta a “Acondicionamiento Físico”.

## 3. Objetivos, alcance final y criterios de éxito

### 3.1 Propósito general

Diseñar, construir y operar un espacio privado que ayude al estudiante de
Formación Profesional a identificar su siguiente acción, conservar el contexto
de su aprendizaje y acceder a información revisada y relevante para su ciclo.

### 3.2 Objetivos específicos

1. Personalizar la experiencia a partir del ciclo y curso académico.
2. Reunir planificación, notas y seguimiento del aprendizaje en una misma
   navegación.
3. Facilitar el acceso a competencias y recursos aprobados sin mezclar ciclos
   no relacionados.
4. Incorporar noticias y oportunidades con fuente, vigencia, revisión humana y
   posibilidad de retirada.
5. Proteger la información privada mediante autenticación, autorización en el
   servidor y separación de responsabilidades.
6. Mantener un proceso de entrega reproducible, verificable y reversible.
7. Sostener el servicio y su mejora durante el periodo exigido por el programa.

### 3.3 Alcance entregado y criterio de éxito

| Ámbito | Resultado esperado en la entrega | Estado a 31 de agosto de 2026 |
|---|---|---|
| Acceso | Registro, confirmación, inicio y cierre de sesión, recuperación y acceso con Google | Verificado en producción |
| Personalización | Selección y modificación de ciclo y curso, con acceso condicionado al onboarding | Verificado en producción |
| Organización | Panel, tareas y notas privadas con persistencia | Flujo principal verificado |
| Aprendizaje | Competencias, recursos aprobados, progreso y notas | Progreso y notas verificados; cobertura final por ciclo no cuantificada |
| Descubrimiento | Contenido revisado, vigente y filtrado por ciclo | Mecanismo implementado; noticias de producción con fallo o cobertura insuficiente |
| Calendario | Planificación local y conexión opcional con Google Calendar | Planificación local disponible; consentimiento de Google no completado en producción |
| Calidad y entrega | Release inmutable, CI satisfactoria, despliegue y endpoints operativos | Verificado para la versión congelada |
| Impacto | Mejorar claridad, relevancia y continuidad para el estudiante | Impacto esperado; todavía no medido con un estudio formal |

Quedan fuera del alcance un LMS completo, la emisión de acreditaciones, la
sustitución del asesoramiento docente, la toma automática de decisiones, una
red social, un panel administrativo general, la cobertura de ciclos no
declarados y la publicación automática de fuentes sin revisión.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `PRD-002`–`PRD-018`, `QAL-001`,
> `QAL-002`, `IMP-001` e `IMP-002`. No añadir objetivos numéricos retrospectivos
> ni convertir cobertura pendiente (`DAT-*`) en resultado.

## 4. Solución entregada y capacidades

### 4.1 Entrada y personalización

La portada pública explica la propuesta y dirige al registro o al acceso. Una
cuenta por correo necesita confirmación antes de iniciar sesión y dispone de
recuperación de contraseña. También existe inicio de sesión con identidad de
Google. Tras el primer acceso, el onboarding solicita ciclo y curso académico;
ninguna ruta privada muestra contenido hasta completar esta información.

### 4.2 Panel y planificación personal

El panel actúa como punto de retorno. Prioriza las próximas acciones y permite
crear elementos sin abandonar el contexto. Las tareas admiten creación,
modificación y finalización. Bloc conserva notas privadas y la planificación
local reúne compromisos del propio usuario. Este estado pertenece al
estudiante y se consulta siempre con su identidad resuelta en el servidor.

### 4.3 Competencias y aprendizaje

La ruta de competencias presenta el mapa asociado al ciclo activo. Desde él se
pueden abrir recursos previamente aprobados, utilizar el reproductor y guardar
progreso o notas para continuar más adelante. AL-LIO conserva el progreso
personal aunque el catálogo compartido evolucione; no interpreta ese progreso
como una calificación oficial ni como evidencia de aprendizaje adquirido.

### 4.4 Información y oportunidades

El producto incluye superficies para noticias, cursos, eventos, retos,
empresas, oportunidades laborales, candidaturas y elementos guardados. Su
disponibilidad depende de que exista contenido válido para el ciclo y de que
la función correspondiente esté habilitada. Las empresas forman un catálogo
curado y no se presentan como vacantes en tiempo real. Los enlaces externos
conservan la fuente oficial para que el usuario pueda comprobar condiciones y
realizar la acción fuera de AL-LIO cuando corresponda.

### 4.5 Perfil y continuidad

El perfil permite actualizar la información funcional, incluido el ciclo. El
cambio modifica el contexto que usan las consultas posteriores. La navegación
mantiene la misma jerarquía esencial en escritorio y en anchura móvil, sin
pretender que ambos diseños sean idénticos píxel a píxel.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `PRD-001`–`PRD-017`. Figuras
> propuestas: `VE-01A` o `VE-01B` para entrada; `VE-02` para personalización;
> `VE-03` para panel; `VE-04` y `VE-05` para aprendizaje; `VE-06` para tareas;
> `VE-08` para oportunidades; `VE-09` para perfil. Usar únicamente el
> subconjunto no redundante aprobado en #301.

## 5. Diseño y experiencia de usuario

La experiencia se diseñó alrededor de una pregunta sencilla: “¿qué debería
hacer ahora?”. El panel reduce el número de decisiones iniciales, las rutas se
agrupan por intención —organizar, aprender y descubrir— y el perfil activo
explica por qué una competencia o contenido resulta relevante.

El onboarding evita mostrar un espacio genérico antes de conocer el ciclo. La
interfaz utiliza estados vacíos y mensajes de error para distinguir entre no
tener datos, no disponer de contenido y sufrir un fallo parcial. Esta
distinción es importante: si una fuente externa falla, las tareas, notas y el
progreso propio no deben desaparecer ni presentarse como dañados.

La aplicación está planteada para escritorio y anchuras móviles. La
implementación incluye navegación específica, controles con foco visible,
etiquetas semánticas en componentes relevantes y respeto por la preferencia de
movimiento reducido en varias superficies animadas. Estas medidas describen
decisiones implementadas, pero no equivalen a una certificación de
accesibilidad. No se ha realizado una auditoría manual completa con tecnologías
de apoyo ni se declara conformidad integral con WCAG.

La revisión final del propietario se realizó con Chrome de escritorio. La
navegación responsive fue comprobada en navegador, pero no se documentó una
sesión independiente en un dispositivo móvil físico. Por ello, la evidencia
visual móvil se presentará como viewport responsive, no como prueba de
dispositivo.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `PRD-017`, `QAL-002` e `IMP-003`.
> Figura propuesta: `VE-10`, con pie que indique expresamente “viewport móvil
> responsive”. No afirmar cumplimiento WCAG ni prueba física.

## 6. Diseño técnico del sistema

AL-LIO utiliza una arquitectura web modular desplegada mediante contenedores.
El acceso público termina en Caddy, que gestiona HTTPS y dirige el tráfico a
la aplicación Next.js. La aplicación contiene la interfaz, las rutas de API,
las acciones de servidor, la autenticación y la autorización. PostgreSQL es
la fuente de verdad para perfiles y estado del producto.

AL-LIO Radar se ejecuta como un servicio separado. No comparte la red interna
de la base de datos ni recibe sesiones de estudiantes. Su única integración
con la aplicación es un webhook HTTPS firmado para entregar lotes que ya han
superado el proceso de revisión. Esta separación reduce el alcance de un fallo
del recolector y evita que una fuente externa tenga acceso indirecto a datos
privados.

| Componente | Responsabilidad principal | Límite relevante |
|---|---|---|
| Caddy | HTTPS y encaminamiento público | No almacena el estado funcional de AL-LIO |
| Aplicación Next.js | Interfaz, API, autenticación, autorización e integraciones | Accede a PostgreSQL con un rol restringido |
| PostgreSQL | Perfiles, tareas, notas, progreso y catálogos entregados | Solo es accesible desde la red interna autorizada |
| AL-LIO Radar | Recogida, normalización, revisión y entrega de contenido | No puede leer cuentas, perfiles ni actividad del estudiante |
| Migrador | Aplica cambios de esquema ordenados | Usa una credencial separada y no se ejecuta en el arranque normal |
| Proveedores externos | Identidad, Calendar, correo y fuentes públicas | Son opcionales o están encapsulados tras límites propios |

El código organiza las capacidades por áreas funcionales y mantiene separados
los módulos de cliente, servidor y persistencia. Las decisiones estructurales
relevantes están registradas como ADR, lo que permite explicar no solo cómo se
construyó el sistema, sino por qué se adoptaron sus límites principales.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `ARC-001`, `ARC-002`, `SEC-003` y
> documentación de arquitectura. #323 puede convertir esta tabla en un
> diagrama compacto; no usar una captura de pantalla para demostrar topología.

## 7. Modelo de datos, autenticación e integraciones

### 7.1 Datos y propiedad

PostgreSQL conserva la identidad funcional, el perfil, el rol, las tareas, las
notas, el progreso de aprendizaje, los elementos guardados y el estado de las
candidaturas. También contiene los catálogos que la aplicación puede mostrar
después de aplicar sus reglas de publicación. Las operaciones privadas se
limitan con el identificador obtenido de la sesión en el servidor; el cliente
no decide a qué usuario pertenece una petición.

Las contraseñas no se almacenan en texto claro. Las cuentas creadas por correo
guardan un hash y requieren confirmación. Las sesiones viajan en una cookie
firmada, `HttpOnly` y `SameSite=Lax`, segura en producción. Un sello de
seguridad respaldado por la base de datos permite invalidar sesiones anteriores
cuando cambia una credencial sensible.

### 7.2 Google y correo

La identidad de Google y Google Calendar son integraciones separadas. Iniciar
sesión con Google utiliza permisos mínimos de identidad. Conectar Calendar
requiere una sesión válida de AL-LIO y un consentimiento adicional. La
credencial de Calendar se cifra en una cookie `HttpOnly`, queda vinculada al
usuario de AL-LIO que completó el flujo y no se persiste en PostgreSQL. Cada
ruta de Calendar vuelve a validar la sesión y rechaza credenciales antiguas,
sin propietario o pertenecientes a otro usuario.

Resend gestiona los mensajes transaccionales de confirmación y recuperación.
Los contactos públicos `hola@al-lio.app` y `privacidad@al-lio.app` se mantienen
separados de la dirección privada del responsable.

### 7.3 Evolución del esquema

El esquema parte de una base inmutable y evoluciona mediante migraciones
ordenadas, transaccionales y verificadas. La aplicación utiliza un rol de
ejecución restringido; solo el proceso de migración recibe la credencial capaz
de modificar el esquema. La estrategia prioriza cambios compatibles hacia
delante y ensayos de restauración antes de operaciones de riesgo.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `SEC-001`–`SEC-005`, `ARC-002`,
> `ENG-004` y `OPS-005`. No publicar cookies, tokens, secretos, filas de
> usuario ni detalles del buzón privado. La integración de Calendar está
> implementada, pero su consentimiento de producción sigue limitado como se
> explica en las secciones 3 y 13.

## 8. AL-LIO Radar y control editorial del contenido

Radar separa la captación de información externa de la experiencia privada
del estudiante. Trabaja con un catálogo acotado de fuentes públicas, obtiene
metadatos, valida el formato, normaliza y elimina duplicados. El resultado no
se publica automáticamente: los candidatos de las fuentes habilitadas pasan
por una revisión humana que registra la decisión y su motivo.

Cuando un lote está aprobado, Radar lo congela y lo envía al webhook de
AL-LIO. La petición incluye versión de contrato, fecha, identificador de
entrega y firma HMAC. La aplicación comprueba tamaño, esquema, firma y ventana
temporal antes de escribir. La entrega es transaccional e idempotente: repetir
un mismo identificador no duplica el contenido.

El gobierno no termina con la aprobación. Los elementos conservan su
procedencia, pueden tener fecha de caducidad y pueden retirarse sin borrar la
traza editorial. Las consultas del estudiante excluyen candidatos rechazados,
retirados, inactivos, no disponibles o fuera de vigencia, y aplican el ciclo
del perfil en el servidor.

Este modelo prioriza confianza y control frente a volumen automático. También
implica una dependencia real del trabajo editorial: si disminuye la revisión
o falla la entrega, la actualidad del catálogo se resiente. Esa limitación se
observó en las noticias de producción y no se oculta mediante cifras globales
sin contexto.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `SEC-004`, `GOV-001`, `GOV-002` y
> `DAT-001`–`DAT-007`. Los agregados finales de catálogo no se obtuvieron con
> una frontera suficientemente segura, por lo que no deben aparecer números.
> Figura propuesta: `VE-07` solo si producción ofrece una noticia revisada
> real; de lo contrario usar la variante de limitación y explicarla como tal.

## 9. Seguridad, infraestructura y operación en producción

La seguridad se distribuye en varias capas. Caddy limita la entrada pública a
HTTPS; la sesión se valida en el servidor; las operaciones derivan allí la
propiedad del usuario; PostgreSQL permanece en una red interna; Radar queda
fuera de esa red; y las entregas externas requieren firma, vigencia e
idempotencia. Los contenedores web y Radar se ejecutan sin privilegios de root,
con sistema de archivos de solo lectura, capacidades de Linux eliminadas y
límites de recursos y logs.

La producción se aloja en un VPS de OVH y el dominio y DNS se gestionan en
Cloudflare. El despliegue automatizado solo puede avanzar después de que la
integración continua supere sus comprobaciones para el SHA exacto de `main`.
La imagen web se identifica con ese SHA, se construye antes de detener el
servicio sano y conserva la referencia anterior para poder revertir una
regresión. Un cambio exclusivo de la web no reemplaza PostgreSQL ni Radar.

La aplicación expone dos comprobaciones distintas: salud confirma que el
proceso web responde y disponibilidad comprueba además la conexión con la base
de datos. En el corte de evidencia ambas respondieron correctamente por HTTPS.
La release congelada se desplegó de forma satisfactoria y el endpoint protegido
de Radar rechazó el acceso no autenticado.

El repositorio también define el modelo de copia, restauración y rollback. No
obstante, la existencia del procedimiento no demuestra que el control esté
operando. A la fecha de entrega no se había acreditado monitorización externa,
alertas del host y de Radar, una política automatizada de copias cifradas fuera
del VPS ni un ensayo aislado de restauración con fecha. Existe una copia local
fuera del VPS declarada por el responsable, pero su programación, retención y
cifrado no están documentados. Estas mejoras permanecen abiertas y no se
presentan como capacidad entregada.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `QAL-003`, `OPS-001`, `OPS-003`,
> `OPS-004`, `OPS-005`, `ARC-001` y `VER-004`. Referencias inmutables internas:
> web `1e516ead8f69d60a263718c20d59b97c9618c97a`; Radar source
> `6111ad04ea4de13c55690c8efc1fec9832bedec2`, imagen
> `al-lio-radar:6111ad0`; despliegue `33404461730`. No exportar inventarios
> privados ni afirmar que los controles de #316/#317 ya están activos.

## 10. Método de desarrollo, pruebas y control de calidad

El desarrollo se realizó de forma incremental, con cambios acotados,
revisiones mediante pull request y decisiones arquitectónicas documentadas.
La estructura evolucionó hacia módulos orientados a capacidades para evitar
que la interfaz, la lógica de servidor y la persistencia quedaran acopladas.
Las migraciones de datos se versionaron junto al código y los cambios de
producción se vincularon a referencias inmutables.

La integración continua ejecuta análisis estático, validación de estructura y
límites, pruebas, comprobaciones de catálogos, contratos de Radar, preparación
de despliegue, integración con PostgreSQL, migraciones y compilación. El
proyecto separa las pruebas en cinco capas: unitarias, contrato, integración,
arquitectura y operaciones.

Para la versión congelada se registraron **41 archivos de prueba** y una
ejecución satisfactoria de **345 pruebas, con 0 fallos**. La compilación
terminó correctamente, la revisión de dependencias no informó vulnerabilidades
en la instalación y CodeQL finalizó de forma satisfactoria. El release contiene
**15 migraciones ordenadas**, de `0002` a `0016`, además del esquema base.
Estas cifras aportan contexto de ingeniería; no se usan como medida de impacto
social ni sustituyen una prueba de usuario.

El smoke test del propietario, realizado el 31 de agosto de 2026 en Chrome de
escritorio, confirmó registro, acceso, cierre de sesión, recuperación,
identidad de Google, onboarding, panel, tareas, perfil, ciclo, progreso y
notas. Fue una verificación parcial: Calendar no completó el consentimiento,
las noticias fallaron o mostraron muy poco contenido y no se registró una
sesión móvil física ni una matriz completa para los cinco ciclos.

Parte de la cobertura automatizada valida contratos y estructura de código sin
ejecutar un navegador real. Por ello se mantiene como mejora futura ampliar
las pruebas end-to-end de los recorridos críticos, además de verificar
rendimiento y accesibilidad de extremo a extremo.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `ENG-003`, `ENG-004`, `QAL-001` y
> `QAL-002`. CI exacta `33404234578`; CodeQL `33404234583`. No exportar el
> detalle de comandos, taxonomía histórica, logs ni recuentos del baseline de
> trabajo anteriores a la versión congelada.

## 11. Hitos y cronología del programa

| Periodo | Hito | Resultado principal |
|---|---|---|
| Abril–mayo de 2026 | Fundamentos | Base Next.js y TypeScript, PostgreSQL y primeras superficies para estudiantes |
| Junio–mediados de agosto | Construcción del producto | Tareas, calendario, Bloc, competencias, recursos, cursos, eventos, guardados y perfil |
| 22–27 de agosto | Consolidación y preparación de producción | Sesiones firmadas, revisión de arquitectura, entrega firmada de Radar, migraciones y despliegue controlado |
| Finales de agosto | Gobierno de contenido | Contenido canónico de Radar, noticias verificadas, oportunidades y controles de vigencia y retirada |
| 28–31 de agosto | Pulido y entrega | Onboarding guiado, navegación móvil, reorganización de pruebas, límites funcionales y preparación de la memoria |
| 31 de agosto de 2026 | Release de referencia | CI satisfactoria, despliegue del SHA congelado, salud y disponibilidad verificadas |
| Septiembre de 2026–agosto de 2027 | Operación y evolución | Soporte, seguridad, mejoras, validación con usuarios y cierre de brechas operativas |

Los periodos describen fases de trabajo y no dedicación continua a jornada
completa. La entrega no se considera el final del proyecto: fija una versión
reproducible para evaluar el programa mientras el producto sigue vivo.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** cronología contrastada con historial,
> ADR y `QAL-001`/`VER-004`. Las fases previas son contexto histórico; la única
> referencia de entrega es `aircury-2026-delivery`. #323 puede representar la
> tabla como línea temporal, sin añadir cifras de commits todavía no
> recolectadas.

## 12. Resultados técnicos, impacto, cumplimiento, sostenibilidad y mantenimiento

### 12.1 Resultados técnicos

AL-LIO llegó al corte de entrega como una aplicación pública y operativa en su
dominio canónico, vinculada a un tag, commit e imagen web coincidentes. La
integración continua, el despliegue y las comprobaciones públicas de salud y
disponibilidad quedaron registrados para esa versión. Los recorridos privados
principales de cuenta, personalización, planificación y aprendizaje fueron
reproducidos por el propietario, con las excepciones declaradas.

El resultado más relevante no es el volumen de código, sino la existencia de
un flujo coherente que conecta perfil, siguiente acción, progreso privado y
descubrimiento gobernado. La arquitectura conserva límites explícitos entre
datos del estudiante, catálogos compartidos, recopilación externa y operación
de producción.

### 12.2 Impacto social esperado e inclusión

AL-LIO pretende reducir el esfuerzo de coordinar herramientas y fuentes,
mejorar la claridad del siguiente paso y facilitar que información formativa y
profesional llegue con contexto de ciclo, fuente y vigencia. Son resultados
esperados, no efectos medidos. A 31 de agosto de 2026 todavía no se había
realizado un estudio formal con estudiantes.

La validación futura utilizará cuentas y datos ficticios, consentimiento
explícito y resultados agregados. Evaluará finalización de tareas, tiempo para
encontrar información, relevancia percibida, claridad y facilidad de uso, e
informará la distribución por ciclos y las limitaciones de la muestra. No se
publicarán identidades, correos, registros privados ni respuestas que permitan
reidentificar a una persona.

La inclusión se aborda mediante una experiencia en español, cinco itinerarios
formativos distintos, navegación responsive, mecanismos de teclado, foco,
semántica y movimiento reducido. También se reconocen riesgos: cobertura
desigual por ciclo, sesgo de fuentes y revisión, dependencia de conectividad y
servicios externos y defectos de accesibilidad que una revisión estructural no
puede detectar.

### 12.3 Encaje con Aircury Summer of Code 2026

- **Impacto social:** aborda un problema concreto de organización y acceso a
  información relevante para estudiantes de Formación Profesional. El impacto
  se presenta como esperado hasta disponer de investigación con usuarios.
- **Innovación:** integra planificación privada, continuidad de aprendizaje y
  descubrimiento revisado por ciclo, con Radar aislado de los datos del
  estudiante. No se afirma exclusividad de mercado.
- **Inclusión:** soporta cinco ciclos de ámbitos diferentes y hace visibles las
  posibles desigualdades de cobertura en lugar de ocultarlas en un total.
- **Comunidad:** el código se publica con licencia MIT y el gobierno del
  contenido prioriza fuentes comprobables y revisión humana.
- **Viabilidad y ejecución:** existe una versión desplegada, verificable y
  mantenible, un responsable identificado y un plan de continuidad anual.

El propietario confirma que AL-LIO no se había presentado anteriormente a
otro concurso ni programa de subvenciones. Los anexos legales exigidos por el
programa se enviaron por separado y no forman parte de esta memoria técnica.

### 12.4 Sostenibilidad económica

El coste base conocido se compone de **28 EUR al mes** por el VPS de OVH y
**15 EUR al año** por el dominio gestionado en Cloudflare. El correo
transaccional con Resend tiene un coste actual declarado de **0 EUR** mientras
el uso permanezca dentro del plan vigente. El equivalente estimado es **29,25
EUR al mes** y **351 EUR para doce meses**.

La estimación no es una auditoría de facturas. No confirma el tratamiento del
IVA ni una posible distribución del coste si el VPS comparte cargas. Tampoco
incluye monitorización externa, almacenamiento cifrado fuera del VPS o futuros
cargos por consumo de proveedores y API, porque todavía no se han seleccionado
o acreditado. ChatGPT y Claude se consideran herramientas de desarrollo, no
dependencias de ejecución de AL-LIO, y quedan fuera del coste operativo.

### 12.5 Mantenimiento hasta el 31 de agosto de 2027

Daniel García Ortega asume la responsabilidad de hosting y dominio,
incidencias y rollback, actualizaciones y seguridad, revisión editorial de
Radar y evolución del producto. El plan incluye mantener el dominio y el VPS,
revisar dependencias, corregir fallos, continuar incorporando mejoras y atender
los canales públicos de soporte y privacidad.

Las prioridades operativas son configurar monitorización externa y alertas,
automatizar copias cifradas fuera del VPS, definir retención y realizar ensayos
de restauración registrados. La continuidad anual es un compromiso del
proyecto; no se presenta como evidencia de trabajo futuro ya realizado.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** `OPS-001`, `OPS-002`, `VER-004`,
> `IMP-001`–`IMP-004`, `ECO-001`, `ECO-002`, `DEL-006`–`DEL-008`. Mantener la
> distinción entre resultado entregado, impacto esperado y controles futuros.
> No incorporar costes desconocidos ni llamar “gratuito” a un servicio salvo
> bajo el supuesto de uso actual ya expresado.

## 13. Limitaciones, hoja de ruta y conclusiones

### 13.1 Limitaciones a la fecha de entrega

1. **Google Calendar:** la implementación separa identidad y Calendar y protege
   la propiedad de la credencial, pero el consentimiento no pudo completarse
   en producción por el aviso de aplicación no verificada de Google.
2. **Noticias:** la superficie y el gobierno están implementados, pero el smoke
   test observó fallos o muy poco contenido en producción. No se publican
   totales no verificados.
3. **Validación móvil y accesibilidad:** existe diseño responsive y evidencia
   de navegador, pero no una prueba documentada en dispositivo físico ni una
   auditoría completa de accesibilidad.
4. **Usuarios e impacto:** no se ha realizado todavía un estudio formal con
   estudiantes; el beneficio social se mantiene como hipótesis razonada.
5. **Operación:** faltan pruebas de monitorización externa, alertas, copias
   automatizadas y cifradas fuera del VPS y restauraciones periódicas.
6. **Disponibilidad:** un único VPS simplifica costes y operación, pero no
   ofrece redundancia multinodo; un fallo del host requiere recuperación o
   rollback.
7. **Cobertura editorial:** la cantidad y actualidad de recursos y
   oportunidades puede variar entre ciclos y depende de revisión humana.
8. **Pruebas:** la cobertura automatizada es amplia, aunque parte verifica
   contratos de código y no reemplaza recorridos completos en navegador.

### 13.2 Hoja de ruta priorizada

| Prioridad | Siguiente resultado | Criterio de cierre |
|---|---|---|
| Alta | Estabilizar las noticias y su cobertura por ciclo | Flujo reproducible en producción, métricas por ciclo y estado vacío/error correcto |
| Alta | Completar monitorización y recuperación | Alertas externas, copias cifradas fuera del VPS y restauración aislada registrada |
| Alta | Completar la verificación de Google Calendar | Consentimiento verificado y recorrido de conexión/desconexión reproducido sin debilitar seguridad |
| Media | Ampliar pruebas E2E, móviles y de accesibilidad | Recorridos críticos en navegadores y dispositivos definidos, con barreras documentadas |
| Media | Validar con estudiantes | Estudio consentido, resultados agregados y limitaciones de muestra explícitas |
| Continua | Mantener seguridad, catálogo y producto | Dependencias revisadas, incidencias atendidas, fuentes actualizadas y mejoras versionadas |

### 13.3 Conclusión

AL-LIO demuestra una solución funcional y técnicamente estructurada para un
problema cotidiano de la Formación Profesional: convertir información dispersa
en contexto y siguientes acciones relevantes. La versión entregada integra
organización privada, continuidad de aprendizaje y descubrimiento revisado,
con límites de seguridad y gobierno identificables.

La memoria no presenta la entrega como un producto terminado en sentido
absoluto. Expone lo que funciona, lo que se verificó, lo que falló y aquello
que aún debe medirse. Esa transparencia permite fijar una base fiable para la
evaluación de Aircury y, al mismo tiempo, orientar el trabajo de soporte y
mejora durante el año siguiente.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** limitaciones respaldadas por
> `QAL-002`, `PRD-010`, `PRD-011`, `PRD-017`, `IMP-001`, `IMP-003`, `OPS-004`
> y `ECO-002`. La hoja de ruta es trabajo futuro; no asociar fechas o promesas
> adicionales sin una decisión posterior del propietario.

## Agradecimiento

AL-LIO ha sido desarrollado en el marco de **Aircury Summer of Code 2026**.
El proyecto agradece a **Aircury SL** el impulso del programa y su apuesta por
iniciativas tecnológicas con impacto social, vocación abierta y continuidad
más allá de la entrega.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** reconocimiento exigido por las bases y
> respaldado por `DEL-007`, `README.md` y `NOTICE.md`.

## Cierre

**AL-LIO — Organiza, aprende y avanza con contexto.**

- Proyecto: <https://al-lio.app>
- Código fuente: <https://github.com/danielgarciaortega-dev/al-lio>
- Contacto: <hola@al-lio.app>
- Autor: Daniel García Ortega

Versión de referencia: `aircury-2026-delivery` · 31 de agosto de 2026.

> **NOTA INTERNA — NO EXPORTAR AL PDF:** enlaces y versión respaldados por
> `VER-001`–`VER-004`. El lema es una propuesta editorial y puede ajustarse en
> #323 sin alterar las afirmaciones técnicas.

---

# Mapa interno de figuras — no exportar como sección de la memoria

Las imágenes se seleccionarán después de la revisión de #301. Esta tabla
define ubicación y pie propuestos; no obliga a utilizar las diez evidencias en
el PDF. El conjunto final debería contener entre seis y ocho imágenes no
redundantes.

| Evidencia | Ubicación propuesta | Pie de figura propuesto | Condición editorial |
|---|---|---|---|
| `VE-01A` | Portada o sección 2 | “Portada pública de AL-LIO y acceso al espacio del estudiante.” | Preferir frente a `VE-01B` si la portada ya necesita una imagen principal |
| `VE-01B` | Sección 4 | “Recorrido público de la propuesta de valor y sus principales áreas.” | Usar solo si aporta información distinta de `VE-01A` |
| `VE-01C` | Sección 4 | “Entrada a la cuenta mediante contraseña o identidad de Google, sin exponer datos personales.” | Secundaria; omitir si el flujo queda claro con texto |
| `VE-02` | Sección 4 | “Selección del ciclo y curso académico que establece el contexto de la experiencia.” | Recomendada |
| `VE-03` | Secciones 1 o 4 | “Panel personalizado con las próximas acciones del estudiante.” | Recomendada como vista global del producto |
| `VE-04` | Sección 4 | “Competencias filtradas para el ciclo activo.” | Puede agruparse visualmente con `VE-05` |
| `VE-05` | Sección 4 | “Recurso aprobado con progreso y notas ficticias conservadas por el usuario.” | Recomendada; revisar que las notas sean inequívocamente ficticias |
| `VE-06` | Sección 4 | “Tarea ficticia completada para mostrar el ciclo básico de planificación.” | Recomendada si demuestra un estado persistido claro |
| `VE-07` | Secciones 8 o 13 | “Estado real de las noticias de producción en la fecha de captura.” | Mostrar éxito solo si existe; en caso contrario utilizar la captura de limitación y explicarla |
| `VE-08` | Secciones 4 u 8 | “Oportunidad revisada con fuente y acción disponible para el perfil.” | Recomendada si la procedencia resulta legible |
| `VE-09` | Sección 4 | “Perfil ficticio y ciclo activo que controlan la personalización.” | Secundaria si `VE-02` ya demuestra el mismo concepto |
| `VE-10` | Sección 5 | “Jerarquía principal de AL-LIO en un viewport móvil responsive.” | Etiquetar como viewport emulado, no dispositivo físico |

## Control final para #323 — no exportar

- El propietario debe aprobar la motivación personal de la sección 2.3.
- El propietario debe aprobar el texto completo antes de integrarlo en el
  generador.
- #323 decidirá la selección definitiva de seis a ocho imágenes y no insertará
  ninguna que no haya superado la revisión técnica, de privacidad y editorial
  de #301.
- La maquetación puede acortar pies o tablas, pero no puede eliminar las
  limitaciones materiales ni cambiar la clase de una afirmación.
- El PDF no incluirá este control, las notas internas, IDs de evidencia,
  consultas, comandos, logs ni información privada.
- La entrega no incluirá apéndice técnico, vídeo ni presentación.
