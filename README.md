# Nexo · Tienda online

La aplicación ahora incluye catálogo, carrito, cuentas, pedidos, comprobantes y evidencias de entrega. Para ejecutarla, conectar Supabase y preparar Android, consulta [la guía de la tienda](docs/GUIA-TIENDA.md).

Funciona de inmediato en modo demostración, sin cobros reales. La integración con Supabase requiere configuración; la pasarela de pago online está pendiente.

## Referencia de la galería original

Aplicación Ionic/Angular standalone con Capacitor. Captura fotografías y las recupera al volver a abrir la aplicación. La primera pestaña contiene la galería y la segunda las instrucciones.

## Requisitos

- Node.js compatible con Angular 22 (este proyecto se verificó con Node 24.22.1).
- npm y dependencias instaladas con `npm ci`.
- Navegador moderno con cámara disponible y permiso concedido. Usar localhost o HTTPS.
- Para Android: Android Studio, SDK API 36, un emulador y JDK compatible con Gradle. Se recomienda el JDK integrado de Android Studio.

## Ejecutar en navegador

```sh
npm ci
npm start
```

Abrir http://localhost:4200. Pulsar «Tomar fotografía», permitir la cámara y confirmar. Recargar para comprobar la persistencia. El navegador puede ofrecer selección de archivos como alternativa si no hay cámara; eso no sustituye la evidencia de cámara en el emulador.

## Android

La carpeta `android` ya está creada. Después de cada modificación web:

```sh
npm run build
npx cap sync android
npx cap open android
```

En Android Studio, esperar la sincronización de Gradle, seleccionar un emulador en Device Manager y pulsar Run. Si se solicita el SDK, seleccionar el instalado. No es necesario añadir otra vez la plataforma.

## Verificación

```sh
npm run lint
npm run test:unit
npm run test:e2e
```

Playwright necesita Chromium instalado (`npx playwright install chromium` si falta). La prueba de interfaz no acredita por sí sola el funcionamiento de una cámara real.

Para usar Chrome ya instalado desde PowerShell: `$env:PLAYWRIGHT_CHANNEL = 'chrome'` y después `npm run test:e2e`.

## Cómo funciona

- `src/app/services/photo.service.ts`: captura con Camera.takePhoto, guarda imágenes en Filesystem Directory.Data y el listado de rutas y fechas en Preferences.
- `src/app/tab1/`: interfaz, carga inicial y mensajes de error o cancelación.
- `src/main.ts`: registro de PWA Elements para la cámara web.
- `capacitor.config.ts`: identificación de la aplicación y salida web `www`.
- `android/`: proyecto nativo Android generado con Capacitor.

En web, Filesystem utiliza almacenamiento del navegador. En Android se utiliza el espacio privado de la app. Las fotos no se suben a un servidor ni se guardan automáticamente en la galería pública. Borrar los datos del sitio o de la aplicación elimina su contenido. No incluye sincronización ni copias de seguridad.

## Documentación de la actividad

Seguir `docs/GUIA-EVIDENCIAS.md`. Usar `docs/INFORME-BASE.md` como borrador para elaborar el documento APA en un procesador de texto y exportarlo a PDF. Completar los campos y las evidencias reales; el borrador no certifica pruebas pendientes.

Para entregar el código, incluir src, android, configuración, package.json, package-lock.json y README. Omitir node_modules, .git, cachés, android/.gradle, android/local.properties y directorios build. Añadir el informe en PDF según las indicaciones del docente.

---

*Actualizado: 16 de noviembre de 2026*
