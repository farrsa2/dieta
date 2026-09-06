# INSTRUCCIONES DEL PROYECTO · DIETAS ALMU Y FRAN

Este repositorio publica la web de consulta de las dietas de Almu y Fran. La prioridad absoluta es conservar la fidelidad de las fuentes, la trazabilidad de las versiones y el funcionamiento estable de la versión publicada.

## 1. FUENTES MAESTRAS

Las reglas permanentes del proyecto viven en cinco fuentes lógicas:

- `01_REGLAS_Y_PREFERENCIAS`
- `02_PLANTILLAS`
- `03_EQUIVALENCIAS_Y_CRITERIOS`
- `04_PRODUCTOS_HABITUALES`
- `05_WEB_Y_GITHUB`

Siempre se usa **la versión con timestamp más reciente** de cada archivo. No se mezclan fragmentos de versiones antiguas salvo que una regla vigente remita expresamente a ellos.

`05_WEB_Y_GITHUB` es una fuente permanente independiente para interfaz, navegación, recetas, sincronización y publicación. No debe absorberse o resumirse hasta perder reglas funcionales.

Los PDF del nutricionista son la fuente primaria al incorporar una semana nueva. No se corrigen por intuición ni se mezclan personas, cantidades, alternativas u observaciones.

## 2. VERSIONADO Y NOMBRES

Formato general:

`nombreArchivo_YYYYMMDD_HHMMSS.ext`

Zona horaria: `Europe/Madrid`.

No usar `(1)`, `(2)`, `copy`, `final2` ni variantes equivalentes.

Histórico semanal:

`SEMANAxx_YYYYMMDD_HISTORICO_YYYYMMDD_HHMMSS.md`

Cuadros aprobados/revisados:

- `SEMANAxx_YYYYMMDD_CUADRO01_APROBADO_YYYYMMDD_HHMMSS.md`
- `SEMANAxx_YYYYMMDD_CUADRO02_REVISADO_YYYYMMDD_HHMMSS.md`

Lista de compra, cuando se exporte:

`SEMANAxx_YYYYMMDD_COMPRA_<DIAS>_YYYYMMDD_HHMMSS.csv`

La semana 31/08/2026–06/09/2026 es `SEMANA00`; la semana 07/09/2026–13/09/2026 es `SEMANA01`.

## 3. PROCESO DE UNA SEMANA NUEVA

Cuando el usuario diga «Prepara la semana»:

1. Leer completos los dos PDF e identificar correctamente Almu y Fran.
2. Validar los siete días, las cinco ingestas, cantidades, alternativas, observaciones y recetas. No inventar datos.
3. Preparar y validar Cuadro 01 y Cuadro 02 conforme a las reglas maestras.
4. Para la compra, seguir obligatoriamente la revisión **día a día**: mostrar Almu + Fran, ingredientes/cantidades y equivalencias; esperar validación del usuario; marcar el día como validado; solo entonces pasar al siguiente.
5. Consolidar la compra únicamente después de validar todos los días seleccionados. Crear CSV solo si el usuario lo solicita.
6. Crear el histórico semanal con el nombre vigente y guardarlo en `data/historico/`.
7. Regenerar por completo `data/menu_14_dias.json`, incluyendo las recetas archivadas que deban estar disponibles en la interfaz.
8. Verificar las cuatro vistas: «Comidas y cenas», «Menú · 8 días», «Próxima comida» y «Lista de la compra».
9. Verificar además las reglas de recetas de `05_WEB_Y_GITHUB`.
10. Solo después de validar histórico y JSON, preguntar si se desean borrar los PDF originales. **Nunca borrar PDF sin confirmación expresa.**

## 4. FUENTE OPERATIVA ÚNICA DE LA WEB

La web consulta como fuente de dieta únicamente:

`data/menu_14_dias.json`

Este JSON debe contener como máximo dos semanas operativas e incluir:

- zona horaria y horarios de ingestas;
- identificador, inicio y fin de cada semana;
- menús completos de Almu y Fran;
- Cuadro 01 / comidas y cenas conjuntas y totales cuando existan;
- una única lista conjunta de compra vigente, con cantidades, equivalencias, días y usos;
- recetas necesarias para la interfaz.

Los Markdown históricos y los CSV semanales **no son fuentes de ejecución de la web**. Pueden existir como artefactos históricos, pero la aplicación no debe depender de ellos para funcionar.

La capa de compatibilidad de la lista puede mantener internamente el formato CSV que espera el parser, pero los bytes de esa lista deben proceder del campo de compra incluido en `data/menu_14_dias.json`; no debe existir una segunda fuente semanal independiente.

## 5. VENTANA OPERATIVA

La interfaz trabaja por fecha, no por etiquetas «actual/siguiente».

La vista de menú muestra siempre:

**ayer + hoy + seis días siguientes**.

Tras recibir el menú nuevo, las dos semanas serán normalmente semana en curso + semana siguiente. Entre el lunes y la nueva entrega del miércoles puede mantenerse temporalmente semana anterior + semana en curso para conservar «ayer».

Nunca acumular más de dos semanas en el JSON operativo.

## 6. RECETAS EN LA WEB · REGLA PERMANENTE

Las recetas emergentes se ofrecen únicamente en dos vistas:

- **Menú · 8 días**;
- **Próxima comida**.

No añadir botones de receta en otras vistas salvo instrucción posterior expresa.

### Menú · 8 días

- `👩‍🍳 Ver receta` puede aparecer únicamente en **Comida** y **Cena**.
- Nunca aparece en Desayuno, Media mañana ni Merienda.
- Solo aparece cuando existe una receta/elaboración realmente archivada por el nutricionista para esa preparación.
- Al pulsarlo se abre una **ventana emergente/modal**.
- Si Almu y Fran tienen preparaciones distintas y ambas tienen receta, cada tarjeta puede abrir la suya.
- No inventar, completar ni sustituir recetas.

### Próxima comida

Si la toma mostrada es Desayuno, Media mañana o Merienda:

- mostrar ALMU y FRAN;
- no mostrar TOTAL;
- no mostrar receta.

Si la toma mostrada es Comida o Cena:

- mostrar ALMU y FRAN;
- añadir tarjeta **TOTAL** usando `Comida total` o `Cena total` del Cuadro 01 aprobado;
- ALMU y FRAN no muestran botón de receta;
- únicamente TOTAL puede mostrar `👩‍🍳 Ver receta`;
- el botón aparece solo si existe una receta archivada aplicable;
- la receta se abre en la misma ventana emergente/modal;
- el modal puede reunir varias elaboraciones únicamente si todas están respaldadas por la fuente semanal;
- no inventar elaboraciones.

## 7. HISTÓRICO

`data/historico/` contiene semanas cerradas y artefactos históricos válidos.

- No se usa como fuente de ejecución.
- No se elimina un histórico porque salga de la ventana operativa.
- No deben coexistir copias mal numeradas o con convenciones de nombre obsoletas cuando ya exista el histórico vigente y más completo.

## 8. COMPRA

Exclusiones permanentes de la lista de compra:

- café;
- cualquier leche;
- AOVE / aceite;
- sal.

Las equivalencias estimadas se marcan como orientativas. No se inventan formatos de supermercado que no estén respaldados por las reglas o por una estimación explícitamente indicada.

## 9. PROTECCIÓN DE LA VERSIÓN PUBLICADA

Antes de una modificación estructural del repositorio o de la interfaz:

1. identificar el commit de producción aceptado;
2. conservar una rama estable apuntando exactamente a ese commit;
3. realizar la refactorización en una rama separada;
4. probar móvil y escritorio, navegación, recetas, errores JavaScript y fuentes de datos;
5. promover a `main` solo una versión que mantenga el comportamiento validado.

No introducir observadores, temporizadores o reordenamientos de DOM que puedan reactivarse a sí mismos. Si se usa `MutationObserver`, debe ser acotado y desconectarse antes de modificar el DOM que observa.

## 10. CAMBIOS DE INTERFAZ

Un cambio visual no debe modificar los datos de dieta ni crear una fuente operativa nueva. La cabecera, iconos, filtros, recetas y disposición de tarjetas son presentación; el contenido dietético sigue procediendo del JSON operativo.

La versión aceptada de referencia antes de esta consolidación está preservada en la rama `stable-20260906-1326`.
