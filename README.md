# Lumimila · Estudio de invitaciones

Primera versión funcional independiente de Etsy, con el logo original de Lumimila y su paleta coral (#F88C80), dorado (#FFC765), beige (#BEB2A6) y gris (#606060).

## Editor de tarjetas de Halloween

La sección pública `https://lumimila.net/#tarjetas` contiene tres diseños aprobados: Dulce vampirita, Pequeño vampiro y Fantasmitas felices. Cada tarjeta se personaliza con un nombre (hasta 50 caracteres), tres fuentes de Halloween y siete colores (incluidos negro y blanco); el texto se ajusta en una o dos líneas. El tamaño del nombre se regula del 60% al 180%, con ajuste automático para no salir del área imprimible. La sombra del nombre se puede activar o desactivar y se conserva en el PDF. La ilustración permanece fija. El nombre y estilo se guardan en localStorage de ese navegador y no se envían a un servidor.

El botón de descarga crea un PDF carta de una página (612 × 792 puntos) con **12 tarjetas de 6 × 6 cm**, organizadas en tres columnas y cuatro filas, separación de 3 mm y guías de corte. La vista de hoja utiliza las mismas posiciones que el PDF. Se imprime a tamaño real / 100%. Cada tarjeta se compone a 1254 × 1254 px con la fuente ya cargada; la tipografía queda integrada visualmente en la imagen del PDF. No contiene campos PDF editables.

Esta primera versión permite probar la personalización y descarga directamente. No incorpora cobros ni validación de compras. El estudio privado de invitaciones continúa separado en `/estudio/`.

Código: `dist/cards/core.mjs` (plantillas, ajuste de nombres, distribución y PDF), `dist/cards/editor.mjs` (interacción y canvas), `dist/cards/editor.css` (estilo). Los PNG aprobados están en `dist/assets/cards/`. Para incorporar otro modelo hay que añadir su ficha al catálogo y ruta de `dist/index.html`, y su zona de nombre a `DESIGNS` en `core.mjs`; esta versión todavía no incluye un administrador para subir diseños.

Las fuentes seleccionadas son Night Halloween, Infectious Halloween y Witchat. Sus archivos no incluyen acentos ni ñ. Witch Halloween y Monster Halloween fueron retiradas a petición de la usuaria. La cobertura de glifos visibles se comprobó con FontTools (`font-characters.mjs`), excluyendo contornos vacíos. El editor impide descargar nombres con caracteres no disponibles y lo explica sin eliminar acentos ni sustituir letras. Cada fuente se carga antes de habilitar el PDF, a su peso original 400. Blanco y crema llevan un contorno morado para seguir siendo legibles.

**Estado: prueba local; fuentes pendientes de licencia para publicación.** Night Halloween, Infectious Halloween y Witchat indican solo uso personal en sus archivos adjuntos (guardados junto a las fuentes). La usuaria confirmó que solo tiene esos archivos. No se han publicado en GitHub ni Cloudflare. La ruta de Night no existía; se recuperó `NightHalloween-PersonalUse.ttf` del ZIP suministrado. Antes de publicar, reemplazar las fuentes según corresponda y regenerar su cobertura.

Validación: `node --test tests/cards.test.mjs`. Cubre dimensiones físicas, doce tarjetas sin solapamiento, guías dentro de la hoja, nombres largos y acentuados, recuperación de estado inválido y estructura de exportación PDF. Se comprobó también el PDF descargado en navegador y renderizado: una hoja carta, 12 imágenes de 60 × 60 mm, con la letra manuscrita conservada. Se revisó el editor a 320 px de ancho.

## Uso

Abre la web, selecciona un texto y cambia su contenido, fuente, color o posición. Arrastra los elementos y usa su esquina inferior derecha para cambiar el tamaño. Las flechas del teclado mueven un elemento; Shift mueve 10 puntos. Cmd/Ctrl+Z deshace, Cmd/Ctrl+Shift+Z rehace, Cmd/Ctrl+S guarda una plantilla.

La pestaña Imágenes permite subir archivos PNG/JPG/WebP. Fondos permite elegir una ilustración, subir una imagen o usar un color. Elementos incluye formas básicas. Capas permite seleccionar elementos; las propiedades permiten cambiar su orden y fijar su posición.

En «Mis fuentes», sube archivos .TTF o .OTF de hasta 5 MB cada uno, escribe una muestra y pulsa «Usar fuente» para aplicarla al texto seleccionado. También aparecen en el selector de tipografía. La colección se conserva en IndexedDB dentro de este navegador, con un máximo de 30 fuentes o 50 MB. No se sincroniza entre dispositivos.

Los diseños exportados incluyen los archivos de las fuentes personalizadas que utilizan. Al importarlos en otro navegador, esas fuentes se recuperan automáticamente. La vista del cliente, el PNG y el PDF esperan a que las fuentes estén cargadas para conservar su apariencia. Si falta una fuente, la app pide volver a subirla o importar el diseño con sus fuentes, en lugar de descargar con otra tipografía.

En «Animación», elige Brillo, Confeti, Burbujas o Sin animación. Al activar cualquiera de los tres efectos, las capas de texto aparecen una por una de arriba hacia abajo, con una entrada suave de opacidad y desplazamiento. La secuencia termina en un máximo de 4,5 segundos y los textos permanecen visibles hasta el final. Funciona con o sin audio y se conserva en la vista del cliente y en el MP4. «Sin animación» muestra todo desde el primer instante, incluso cuando hay audio. El editor, PNG y PDF muestran siempre el diseño completo. La vista previa reduce el desplazamiento si el sistema solicita menos movimiento. Puedes subir hasta 3 opciones de audio por invitación (MP3, WAV, M4A, AAC u OGG de hasta 20 MB); la app conserva los primeros 15 segundos y permite ajustar el volumen de cada opción. El cliente puede escucharlas, elegir una o descargar sin audio. «Ver animación y escuchar» reproduce la invitación durante 15 segundos y se detiene al cerrar la vista previa.

«Descargar → Video MP4» genera video H.264 de 1000 × 1400 px a 30 fps con audio AAC. Conserva los textos personalizados, las fuentes y el audio elegido. PNG y PDF siguen siendo estáticos. El MP4 se genera en el navegador mediante WebCodecs: si no dispone de los codificadores necesarios, la app avisa para usar una versión compatible de Chrome, Edge o Safari. Hay progreso y se puede cancelar cerrando la ventana. El video tiene 15 segundos; la duración total del contenedor puede añadir unas centésimas por el relleno del codificador AAC.

Los audios se guardan por separado en IndexedDB (hasta 30 clips en la colección local), y el diseño exportado incluye las tres opciones, incluso si está seleccionada «Sin audio». Al quitar un audio de una invitación, su archivo se conserva localmente para no romper otros diseños o el historial. El formato de respaldo v3 es compatible con importaciones v1 y v2.

Activa «Editable por el cliente» en los textos que podrán personalizarse. «Vista del cliente» abre una copia separada de la plantilla con esos campos. «Descargar» genera PNG de 1500 × 2100 píxeles o PDF de 5 × 7 pulgadas a 300 ppp. El PDF contiene una imagen de alta calidad: no es un PDF vectorial ni incluye sangrado o marcas de corte.

En «Mis diseños» se pueden guardar plantillas y exportar/importar copias JSON. Los cambios se guardan automáticamente en localStorage. El almacenamiento pertenece a cada navegador y dirección web; los diseños de la vista previa local no se transfieren automáticamente al sitio publicado. Exporta e importa una copia para trasladarlos. Si el almacenamiento se llena, la app muestra una advertencia y permite descargar el diseño.

## Alcance de esta versión

- Editor visual, plantilla infantil y lienzo en blanco.
- Textos, imágenes, fondos, formas, orden de capas y deshacer/rehacer.
- Personalización de una copia con ajuste automático de textos largos.
- Guardado local y exportación/importación de diseños.
- Colección de fuentes TTF/OTF con muestras, guardado local y fuentes incluidas en el diseño exportado.
- Tres efectos animados, hasta tres opciones de audio por invitación y selección independiente del cliente.
- Descarga MP4 con audio, vista previa y cancelación del proceso.
- PNG y PDF, con tipografías incluidas localmente.
- Interfaz adaptable a escritorio y celular.

Esta es una primera versión privada para probar el editor. No tiene todavía cuentas, almacenamiento compartido en un servidor, validación de compras, códigos de acceso, pagos ni integración con Etsy. «Vista del cliente» es una vista de prueba dentro del editor, no un portal protegido por cuenta. Antes de vender a compradores reales se necesita implementar ese backend y separar el panel administrativo. El dominio propio no está configurado.

## Estructura del sitio

- `dist/index.html`: portada pública de lumimila.net (más adelante, el catálogo).
- `dist/assets/`: logo y tipografías que usa la portada.
- `dist/estudio/`: el editor. En producción, `lumimila.net/estudio/` está protegido con Cloudflare Access (código por correo).

Publicación: Cloudflare Pages, proyecto `lumimila`, rama `main`, sin comando de build, carpeta de salida `dist`. Cada cambio en `main` se publica solo.

## Ejecutar en otro hosting o equipo

No necesita instalar dependencias ni compilar. Sube el contenido de `dist/` a cualquier hosting estático con HTTPS. Para ejecutar localmente con Node.js:

```sh
node server.mjs
```

Abre http://127.0.0.1:4173/ para la portada y http://127.0.0.1:4173/estudio/ para el editor. Para ejecutar las pruebas:

```sh
npm test
```

## Verificación

Se probaron en navegador los cambios de texto, guardado, independencia entre plantilla y copia, generación de PDF y PNG y la vista de celular a 390 px sin desbordamiento horizontal. El PDF generado se abrió y rasterizó correctamente, y el PNG se verificó a 1500 × 2100 píxeles. Se verificaron cargas TTF y OTF reales, su persistencia tras recargar, el diseño exportado con su fuente y su importación en un origen sin fuentes previas. Se cargaron tres audios, se recortó un archivo de 18 a 15 segundos y se eligió el segundo desde la vista del cliente. El MP4 generado tiene 450 fotogramas H.264, 1000 × 1400 px y audio AAC; se decodificó para comprobar la tipografía y que el sonido corresponde a la opción elegida. También se verificó el respaldo con sus tres audios en otro origen. Veinte pruebas de Node cubren el modelo, las fuentes, audio WAV, límites, integridad, animación y aislamiento de la selección del cliente.

## Recursos

- Logo SVG original proporcionado por la persona usuaria: `dist/assets/lumimila-logo.svg`.
- Tipografías DM Sans y Fraunces distribuidas con sus licencias OFL en `dist/assets/`.
- Mediabunny 1.61.3, sin modificaciones, incluido localmente para generar MP4; licencia MPL-2.0 y enlace al código fuente en `dist/vendor/`.
- Fondo ilustrado en `dist/assets/fiesta-bg.png`, generado con la herramienta integrada ImageGen. Los textos de la invitación son elementos editables independientes del fondo.
- Prompt de la ilustración final: `ASSETS.md`.
