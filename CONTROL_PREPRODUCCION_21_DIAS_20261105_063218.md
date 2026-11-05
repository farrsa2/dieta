# CONTROL PREPRODUCCIÓN · ALMU Y FRAN · 04–25/11/2026

**Comprobación de archivos:** 7/7 formatos correctos. **Referencias de receta:** 44 comprobadas; 0 ausentes.

| Componente | Estado |
|---|---|
| PDF de Almu y Fran | COMPROBADOS (17 y 20 páginas) |
| Calendario 21 días | PREPARADO EN DESARROLLO |
| Cuadro 01 | PROPUESTA 4 semanas sin aprobar |
| Cuadro 02 | PROPUESTA 4 semanas sin aprobar |
| Tacos 7 y 21 | PLATOS FIJADOS; GRAMAJES DE FRAN ORIENTATIVOS |
| Compra día a día | 104 tomas revisadas provisionalmente, 22 fechas pendientes de visto bueno |
| Compra consolidada | NO GENERADA (requiere validar todos los días) |
| Histórico | BORRADOR de recetas originales de los PDF |
| JSON operativo | ACTUALIZADO SOLO EN DESARROLLO, 2 semanas 02–15 nov |
| Ventanas de recetas | IDs explícitos cotejados; pruebas de código positivas, prueba visual no realizada |
| Supabase/Realtime | NO PROBADO EN DISPOSITIVOS |
| Desplegada y main | NO MODIFICADAS (material a aprobar) |

## Pendientes antes de consolidar y publicar

- Los tacos de Fran sustituyen a la niçoise por orden del usuario; pesos estimados 350 g de tacos + yogur 125 g. No se declara equivalencia clínica ni nueva prescripción.
- Almu: 125 g 'tacos de pollo (preparado)' + 30 g de pechuga; compra interpreta 155 g de pollo fresco, pendiente de confirmar que no es doble contabilización.
- Cuscús: el PDF lista 125 g de sémola dentro de una receta completa, sin reparto por comensal; no convertir automáticamente a 125 g para Almu ni para Fran.
- Tomate para salsa de macarrones y arroz a la cubana: formato fresco o preparado aún sin confirmar.
- No se ha borrado ninguno de los PDF.
- El control es estático sobre JSON y código. No equivale a una prueba visual ni funcional completa de GitHub Pages.

**Proceso:** aprobar Cuadro 01, aprobar Cuadro 02, revisar días y validar, consolidar, comprobar 4 vistas y sincronización, promover desarrollo → desplegada → main.

## Archivos de trabajo

- Plan maestro: data/plan_21_dias_20261105_062215.json
- Cuadros de semana 09–12 con marca 20261105_062433
- Revisión diaria: COMPRA_21_DIAS_REVISION_DIARIA_BORRADOR_20261105_062655.md
- Cálculos estructurados: data/revision_compra_21_dias_20261105_062655.json
- Histórico de las pautas originales: SEMANA09_20261102_HISTORICO_BORRADOR_20261105_062756.md
- Operativo de pruebas: data/menu_14_dias.json (rama desarrollo).
