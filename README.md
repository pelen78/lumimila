# Lumimila · Estudio de invitaciones

Primera versión funcional independiente de Etsy, con el logo original de Lumimila y su paleta coral (#F88C80), dorado (#FFC765), beige (#BEB2A6) y gris (#606060).

## Uso

Abre la web, selecciona un texto y cambia su contenido, fuente, color o posición. Arrastra los elementos y usa su esquina inferior derecha para cambiar el tamaño. Las flechas del teclado mueven un elemento; Shift mueve 10 puntos. Cmd/Ctrl+Z deshace, Cmd/Ctrl+Shift+Z rehace, Cmd/Ctrl+S guarda una plantilla.

La pestaña Imágenes permite subir archivos PNG/JPG/WebP. Fondos permite elegir una ilustración, subir una imagen o usar un color. Elementos incluye formas básicas. Capas permite seleccionar elementos; las propiedades permiten cambiar su orden y fijar su posición.

Activa «Editable por el cliente» en los textos que podrán personalizarse. «Vista del cliente» abre una copia separada de la plantilla con esos campos. «Descargar» genera PNG de 1500 × 2100 píxeles o PDF de 5 × 7 pulgadas a 300 ppp. El PDF contiene una imagen de alta calidad: no es un PDF vectorial ni incluye sangrado o marcas de corte.

En «Mis diseños» se pueden guardar plantillas y exportar/importar copias JSON. Los cambios se guardan automáticamente en localStorage. El almacenamiento pertenece a cada navegador y dirección web; los diseños de la vista previa local no se transfieren automáticamente al sitio publicado. Exporta e importa una copia para trasladarlos. Si el almacenamiento se llena, la app muestra una advertencia y permite descargar el diseño.

## Alcance de esta versión

- Editor visual, plantilla infantil y lienzo en blanco.
- Textos, imágenes, fondos, formas, orden de capas y deshacer/rehacer.
- Personalización de una copia con ajuste automático de textos largos.
- Guardado local y exportación/importación de diseños.
- PNG y PDF, con tipografías incluidas localmente.
- Interfaz adaptable a escritorio y celular.

Esta es una primera versión privada para probar el editor. No tiene todavía cuentas, almacenamiento compartido en un servidor, validación de compras, códigos de acceso, pagos ni integración con Etsy. «Vista del cliente» es una vista de prueba dentro del editor, no un portal protegido por cuenta. Antes de vender a compradores reales se necesita implementar ese backend y separar el panel administrativo. El dominio propio no está configurado.

## Ejecutar en otro hosting o equipo

No necesita instalar dependencias ni compilar. Sube el contenido de `dist/` a cualquier hosting estático con HTTPS. Para ejecutar localmente con Node.js:

```sh
node server.mjs
```

Abre http://127.0.0.1:4173/. Para ejecutar las pruebas:

```sh
npm test
```

## Verificación

Se probaron en navegador los cambios de texto, guardado, independencia entre plantilla y copia, generación de PDF y PNG y la vista de celular a 390 px sin desbordamiento horizontal. El PDF generado se abrió y rasterizó correctamente, y el PNG se verificó a 1500 × 2100 píxeles. Siete pruebas de Node cubren validación/importación, aislamiento de la copia, límites de campos, posición de elementos, orden de capas, ajuste de texto y estructura del PDF.

## Recursos

- Logo SVG original proporcionado por la persona usuaria: `dist/assets/lumimila-logo.svg`.
- Tipografías DM Sans y Fraunces distribuidas con sus licencias OFL en `dist/assets/`.
- Fondo ilustrado en `dist/assets/fiesta-bg.png`, generado con la herramienta integrada ImageGen. Los textos de la invitación son elementos editables independientes del fondo.
- Prompt de la ilustración final: `ASSETS.md`.
