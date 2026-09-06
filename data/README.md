# Datos de la web

## Fuente operativa única

La aplicación obtiene los datos de dieta exclusivamente de:

`menu_14_dias.json`

El JSON contiene como máximo dos semanas operativas, horarios, documentos embebidos para los cuadros, recetas y una única lista conjunta de la compra.

La lista de compra puede ser interpretada internamente con formato CSV por compatibilidad con el renderizador, pero su contenido procede del propio JSON. No debe existir un CSV semanal independiente necesario para que la web funcione.

## Ventana por fechas

La interfaz trabaja por fechas y muestra:

**ayer + hoy + seis días**.

Tras recibir el menú del miércoles, las dos semanas serán normalmente semana en curso + semana siguiente. Entre el lunes y la nueva entrega pueden permanecer temporalmente semana anterior + semana en curso para conservar «ayer».

Nunca se acumulan más de dos semanas operativas.

## Histórico

Los históricos válidos viven en:

`historico/`

Nomenclatura:

`SEMANAxx_YYYYMMDD_HISTORICO_YYYYMMDD_HHMMSS.md`

La web no consulta estos archivos en tiempo de ejecución. Se conservan para trazabilidad y consultas históricas.

No deben mantenerse copias con numeración antigua cuando ya exista el histórico vigente y más completo.

## Flujo de actualización

Al incorporar una dieta nueva:

1. validar los PDF de Almu y Fran;
2. generar los cuadros y validar la compra según las reglas del proyecto;
3. guardar el histórico semanal versionado;
4. determinar las dos semanas que forman la ventana operativa;
5. regenerar por completo `menu_14_dias.json`;
6. comprobar «Comidas y cenas», «Menú · 8 días», «Próxima comida» y «Lista de la compra».

Los PDF originales no se eliminan sin confirmación expresa del usuario.
