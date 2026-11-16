# Guía cronológica de capturas y evidencias

Usa esta guía para documentar el proceso en el orden en que se configura y construye la aplicación. Guarda las capturas reales en `docs/evidencias/` y luego insértalas en el informe en el mismo orden. Las capturas son evidencias de lo que se observa; no marques una prueba como exitosa hasta haberla ejecutado.

## Antes de comenzar

- Usa nombres consecutivos como `01-configuracion.png`, `02-dependencias.png` y así sucesivamente.
- En cada captura deja visible el archivo, la pantalla o el resultado que se quiere evidenciar. Evita capturas borrosas o con texto ilegible.
- Si una captura muestra código, enfoca solo las líneas relevantes y conserva visible el nombre del archivo.
- Para terminales, incluye el comando y su resultado. No presentes una captura del código como evidencia de que una prueba se ejecutó.
- Anota la fecha y, para pruebas, el navegador o el modelo/API del emulador utilizado.
- No incluyas datos personales, contraseñas ni información privada.

## Secuencia de evidencias

| N.º / archivo | Momento del proceso | Qué capturar | Qué acredita |
| --- | --- | --- | --- |
| 01 `01-configuracion.png` | Configuración inicial | `package.json`, `angular.json` e `ionic.config.json` en el editor. Si no caben juntos, usa dos capturas consecutivas. | Proyecto Ionic con Angular y scripts de npm. |
| 02 `02-capacitor.png` | Configuración de Capacitor | `capacitor.config.ts` mostrando `appId`, `appName` y `webDir`. | Identidad y configuración de la aplicación nativa. |
| 03 `03-dependencias.png` | Instalación y plugins | Sección `dependencies` de `package.json` con Camera, Filesystem, Preferences, Capacitor e Ionic. Si conservas la terminal de instalación, captura también el comando npm y su finalización. | Plugins y dependencias declarados e instalación realizada, si se muestra su resultado. |
| 04 `04-servicio-fotos.png` | Creación del servicio | `src/app/services/photo.service.ts`, enfocando la llamada a Camera, escritura en Filesystem y persistencia con Preferences. | Lógica de captura y almacenamiento local. |
| 05 `05-interfaz-galeria.png` | Construcción de la galería | `src/app/tab1/tab1.page.html` y la vista de galería en ejecución, si se pueden mostrar claramente. | Botón de captura, listado y estado vacío de la galería. |
| 06 `06-navegacion.png` | Navegación de la aplicación | Barra inferior de la app con Galería y Cómo usar; opcionalmente, `src/app/tabs/tabs.page.html` en una captura aparte. | Acceso a las pantallas principales. |
| 07 `07-compilacion-web.png` | Compilación web | Terminal con `npm run build` y el resultado final sin errores. | Compilación web realizada. |
| 08 `08-galeria-web.png` | Prueba inicial en navegador | App abierta en `localhost:4200`, con la galería visible. | Ejecución de la app en navegador. |
| 09 `09-captura-web.png` | Captura web | Modal de cámara o selector que aparezca al tocar «Tomar fotografía». | Inicio del flujo de captura en navegador. Indica si el navegador abrió cámara o selector de archivo. |
| 10 `10-foto-web.png` | Resultado web | Fotografía visible dentro de la galería, con fecha si aparece. | Captura completada y foto presentada en la app web. |
| 11 `11-persistencia-web.png` | Persistencia web | Recarga el navegador y muestra la misma fotografía en la galería. | Recuperación de la foto después de recargar. |
| 12 `12-sync-android.png` | Preparación de Android | Terminal con `npx cap sync android` y su resultado final. | Sincronización de los archivos web y plugins con el proyecto Android. |
| 13 `13-android-studio.png` | Apertura del proyecto nativo | Android Studio con el proyecto abierto y el emulador seleccionado; espera a que termine la sincronización de Gradle. | Proyecto Android preparado para ejecutarse. |
| 14 `14-app-emulador.png` | Inicio en emulador | Aplicación abierta en el emulador, en la pantalla de galería. | Ejecución de la app en Android. |
| 15 `15-camara-android.png` | Captura Android | Pantalla de cámara abierta desde la app del emulador. | Uso del flujo de cámara nativo en Android. |
| 16 `16-foto-android.png` | Resultado Android | Fotografía tomada visible en la galería del emulador. | Captura y guardado visibles en Android. |
| 17 `17-persistencia-android.png` | Persistencia Android | Cierra o fuerza el cierre de la app, vuelve a abrirla y muestra la foto conservada. | Recuperación de la foto al reabrir la app. |
| 18 `18-pruebas.png` | Verificaciones automatizadas | Terminal con cada comando de prueba ejecutado y su resultado. | Solo las verificaciones que realmente se hayan ejecutado. |

Las capturas 9 y 10 deben reflejar lo que pasó en tu navegador. En web, el plugin puede mostrar una interfaz de cámara o un selector de archivos según el navegador y la disponibilidad de cámara. La prueba de cámara del emulador Android debe documentarse por separado.

## Registro de pruebas manuales

Completa los resultados después de ejecutar cada caso. Anota cualquier fallo y vuelve a probar después de corregirlo; conserva el resultado real.

| Caso | Resultado esperado | Resultado observado | Fecha y entorno |
| --- | --- | --- | --- |
| Captura web | Foto visible en la galería | Pendiente | |
| Persistencia web | Foto presente después de recargar | Pendiente | |
| Cancelación de captura | No se agrega una foto nueva | Pendiente | |
| Permiso de cámara denegado | Se muestra un mensaje y se puede reintentar tras concederlo | Pendiente | |
| Captura Android | Foto visible en la galería del emulador | Pendiente | |
| Persistencia Android | Foto presente al volver a abrir la app | Pendiente | |

## Cómo insertar las capturas en el informe

En el cuerpo del informe menciona cada figura por su número y explica qué demuestra. Usa el formato de figuras que pida tu institución; como referencia APA 7, presenta el número de figura en negrita, el título en cursiva y después la imagen. Añade una nota debajo cuando haga falta indicar el entorno, la fecha o qué parte de la pantalla se muestra.

Ejemplo de título y nota:

**Figura 1**  
*Configuración de dependencias del proyecto Ionic.*

[Inserta aquí la captura `01-configuracion.png`]

*Nota.* Se muestran las dependencias de Ionic, Angular y Capacitor declaradas en `package.json`.

No entregues esta guía como si fuera el informe final. El borrador del informe está en `docs/INFORME-BASE.md`; complétalo con tus datos, figuras, resultados observados, citas y referencias antes de exportarlo al formato solicitado.
