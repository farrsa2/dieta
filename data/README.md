# Datos de la web

## Fuente operativa única

La aplicación consulta exclusivamente:

`menu_14_dias.json`

El JSON contiene como máximo dos semanas operativas, la configuración horaria, los datos necesarios para los cuadros, las recetas utilizadas y una única lista de la compra conjunta.

Tras recibir el menú del miércoles, las dos semanas serán normalmente **semana en curso + semana siguiente**. Entre el lunes y la nueva entrega del miércoles pueden permanecer temporalmente **semana anterior + semana en curso** para que la vista móvil conserve «ayer». Nunca se acumulan más de dos semanas.

La interfaz trabaja por fechas y muestra una ventana móvil de **ayer + hoy + seis días**. Si todavía no existe dieta para una fecha futura, esa fecha aparece vacía.

## Histórico

Los archivos semanales consolidados viven en:

`historico/`

La web no los consulta en tiempo de ejecución. Se conservan para archivo y consultas históricas.

## Flujo de actualización

Al llegar los dos PDF de una nueva semana:
1. se validan Almu y Fran;
2. se crea `historico/YYYYMMDD_SEMANAxx.md`;
3. se determinan las dos semanas que deben quedar en la ventana operativa;
4. se regenera por completo `menu_14_dias.json`;
5. se comprueba la web.

No se mantienen archivos semanales separados como fuentes operativas de la interfaz.
