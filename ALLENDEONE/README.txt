PROVSOFT PWA BASE

Qué incluye
- manifest.json
- service-worker.js
- pwa-register.js
- pwa-shell.html
- iconos SVG

Importante
1) Sin tocar tus apps HTML actuales, sí puedes tener UNA puerta de entrada PWA instalable.
2) Esa puerta de entrada es pwa-shell.html.
3) Desde ahí abres tus módulos existentes.
4) Para que CADA app individual sea una PWA completa e instalable por sí sola, sí necesitas insertar manifest + registro del service worker en cada HTML.

Cómo usar
1. Sube todos estos archivos a la misma carpeta donde están tus apps.
2. Abre pwa-shell.html desde HTTPS.
3. Instala la app desde Chrome/Edge/Android.
4. Desde la shell abre el módulo que quieras.

Limitación honesta
- Cero modificaciones al HTML original = shell instalable, no PWA completa individual por archivo.
- Cambio mínimo posterior recomendado por archivo:
  En <head>:
    <link rel="manifest" href="./manifest.json">
    <meta name="theme-color" content="#00416A">
  Antes de </body>:
    <script src="./pwa-register.js"></script>
