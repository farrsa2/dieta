# AUDITORÍA Y CONSOLIDACIÓN · 2026-09-06 13:40:21 · Europe/Madrid

## Estado protegido

Versión de producción aceptada antes de la consolidación:

- commit: `19986de981d89d1ec65d57af0f324e397247d022`
- rama de retorno: `stable-20260906-1326`
- la rama estable no se modifica durante la consolidación.

Rama de trabajo:

- `consolidacion-20260906-134021`

## Invariantes protegidos

No se modifica el contenido dietético operativo:

- `data/menu_14_dias.json` permanece sin cambios respecto a la versión aceptada;
- se mantienen `SEMANA00` (31/08/2026–06/09/2026) y `SEMANA01` (07/09/2026–13/09/2026);
- se mantienen los dos históricos completos y correctamente numerados;
- no se borran los PDF originales.

## Limpieza realizada

Retirados de la rama de consolidación:

- `data/20260907_SEMANA01_COMPRA_LMX.csv`: duplicaba una compra ya embebida en `data/menu_14_dias.json`;
- `data/historico/20260831_SEMANA01.md`: copia antigua con numeración obsoleta;
- `data/historico/20260907_SEMANA02.md`: copia antigua con numeración obsoleta;
- `shopping-overrides.js`: archivo muerto no cargado por `index.html`.

Se conservan como históricos válidos:

- `data/historico/SEMANA00_20260831_HISTORICO_20260906_120008.md`
- `data/historico/SEMANA01_20260907_HISTORICO_20260906_110548.md`

## Fuente operativa

La fuente dietética de ejecución es:

`data/menu_14_dias.json`

La lista de compra se encuentra dentro de ese JSON. Por compatibilidad con el parser existente, `shopping-layout.js` intercepta únicamente la antigua ruta lógica del CSV y devuelve los bytes del campo `shopping.csv` ya cargado en `window.DIET_OPERATIONAL`. Por tanto no existe petición de red ni segunda fuente física de compra.

`app.js` conserva código heredado capaz de solicitar `semanas.json`, pero `operational-data.js` elimina su listener de inicio antes de `DOMContentLoaded`. Las pruebas de consolidación confirman que no existe ninguna solicitud a `semanas.json`.

Este código heredado se mantiene deliberadamente para no introducir una refactorización grande en la misma consolidación que fija la versión visual aceptada.

## Presentación

Se conserva el aspecto validado por el usuario:

- cabecera compacta fija;
- título a la izquierda y casa a la derecha;
- icono de inicio transparente con 🍽️;
- menú de ocho días;
- lista de compra con filtros y tarjeta de progreso juntos al final.

El movimiento final de filtros y resumen utiliza un `MutationObserver` acotado que se desconecta **antes** de modificar el DOM. No usa bucles de mutación ni temporizadores de reintento.

## Pruebas ejecutadas

Chromium, dos tamaños:

- móvil: 390 × 844;
- escritorio: 1200 × 900.

Comprobaciones superadas:

- Inicio: 4 accesos;
- Comidas y cenas: carga y cabecera;
- Menú · 8 días: 8 fechas;
- Próxima comida: Almu + Fran y navegación;
- Lista de compra: 36 productos;
- filtro `M`: 17 productos visibles;
- filtros y resumen en posición `static` y al final;
- título a la izquierda y botón Inicio a la derecha;
- título móvil no duplicado;
- 0 peticiones a `semanas.json`;
- 0 peticiones al CSV semanal eliminado.

## Capas heredadas conservadas

Se mantienen `mobile-cuadros`, `ui-v2`, `ui-v3`, `ui-v4` y `operational-data` porque forman parte de la versión visual ya validada. Aplanarlas en esta misma operación aumentaría el riesgo sin aportar una mejora funcional inmediata.

Una futura refactorización puede convertir `app.js` + `operational-data.js` en un único núcleo y reducir las capas UI, pero debe hacerse en una rama nueva partiendo de esta versión consolidada y con la misma batería de pruebas.
