# INSTRUCCIONES DEL PROYECTO · DIETAS ALMU Y FRAN

Este proyecto gestiona las dietas semanales de Almudena y Fran y publica una web de consulta.

## FUENTES PERMANENTES

Aplica siempre las reglas y formatos de:
- 01_REGLAS_Y_PREFERENCIAS.md
- 02_PLANTILLAS.md
- 03_EQUIVALENCIAS_Y_CRITERIOS.md
- 04_PRODUCTOS_HABITUALES.md

Los PDF del nutricionista tienen prioridad al incorporar una semana nueva. No mezcles personas ni cantidades.

## COMANDO «PREPARA LA SEMANA»

Cuando el usuario diga «Prepara la semana»:

1. Revisa los dos PDF completos e identifica correctamente Almu y Fran.
2. Valida los siete días, las cinco ingestas, cantidades, alternativas y observaciones. No inventes datos.
3. Genera el Markdown histórico semanal `YYYYMMDD_SEMANAxx.md` y guárdalo en `data/historico/`.
4. Conserva los históricos anteriores en `data/historico/`; no son la fuente que consulta la web.
5. Mantén como máximo dos semanas operativas. Tras recibir el menú del miércoles serán normalmente la semana en curso y la siguiente. Al llegar el lunes, hasta recibir el nuevo menú del miércoles, pueden permanecer temporalmente la semana anterior y la semana en curso para que la vista de ocho días conserve «ayer».
6. Regenera **por completo** `data/menu_14_dias.json`. Este archivo es la única fuente operativa de dietas para la web y debe contener:
   - zona horaria y horarios de ingestas;
   - identificación, inicio y fin de las dos semanas;
   - menú completo de Almu y Fran para cada semana, con cantidades e ingredientes;
   - datos de comidas/cenas conjuntas y totales cuando existan;
   - la lista de la compra única vigente, con cantidades, equivalencias, días y usos;
   - recetas necesarias para las dos semanas, cuando se utilicen en la interfaz.
7. La web trabaja por fecha, no por «semana actual/siguiente». Su vista de menú debe mostrar siempre **ayer, hoy y seis días más**. Si una fecha futura todavía no está cargada, se muestra como vacía.
8. La lista de la compra de la web es siempre una única lista conjunta para Almu + Fran.
9. Actualiza la web/repositorio para que siga leyendo únicamente `data/menu_14_dias.json`; no hagas que la interfaz seleccione archivos Markdown/CSV semanales.
10. Verifica que el JSON es válido y que las vistas «Comidas y cenas», «Menú · 8 días», «Próxima comida» y «Lista de la compra» funcionan con él.
11. Después de comprobar el Markdown histórico y el JSON operativo, pregunta expresamente si el usuario quiere borrar los PDF originales. No los borres sin confirmación.

## REGLAS DE ARCHIVO

- `data/historico/`: semanas cerradas y artefactos históricos.
- `data/menu_14_dias.json`: única fuente operativa de la web.
- La llegada de una semana nueva desplaza la ventana. El miércoles, al incorporar el nuevo menú, el JSON queda normalmente con semana en curso + semana siguiente.
- Entre el lunes y la nueva entrega del miércoles puede conservar semana anterior + semana en curso para que «ayer» siga disponible.
- No acumules más de dos semanas dentro del JSON operativo.
- No elimines históricos por el desplazamiento de la ventana.

## FUNCIONAMIENTO GENERAL

- Si el usuario dice «como siempre», aplica las plantillas maestras vigentes.
- Si cambia una preferencia permanente, actualiza el archivo permanente correspondiente.
- No inventes equivalencias; si son estimadas, márcalas como orientativas.
- Mantén las respuestas claras, breves y cómodas para móvil.
