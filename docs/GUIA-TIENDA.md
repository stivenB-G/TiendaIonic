# Nexo · Tienda online

La galería se convirtió en una tienda con catálogo, búsqueda, filtros, detalles, carrito persistente, pedidos, comprobantes y evidencias fotográficas locales asociadas a pedidos. Interfaz adaptable a móvil y escritorio; precios finales en COP y recogida en tienda.

## Iniciar

```sh
npm ci
npm start
```

Abrir http://localhost:4200. Si PowerShell bloquea `npm.ps1`, usar `npm.cmd` / `npx.cmd`.

Sin configuración externa se activa **Modo demostración**, visible en todas las pantallas. Añadir productos → Carrito → Inicia sesión → Entrar a la demostración → Simular compra. Los pedidos y las existencias simuladas se guardan en este dispositivo. Desde Pedidos se puede registrar una entrega y abrir la cámara para su evidencia. No hay cobros ni cuentas reales en este modo.

## Conectar Supabase

1. Crear un proyecto y ejecutar [supabase/schema.sql](../supabase/schema.sql) en su SQL Editor.
2. Activar Email/Password en Authentication y configurar los correos de confirmación y sus URL de redirección. Para producción, configurar SMTP propio y límites de abuso.
3. En [shop.config.ts](../src/app/services/shop.config.ts), completar `supabaseUrl` (HTTPS, sin `/` final) y `supabaseKey` con la clave **publishable** o **anon** del proyecto. Nunca usar `service_role` ni una clave secreta en el cliente.
4. Reiniciar/recompilar. La demostración se desactiva; aparecen registro e inicio de sesión reales. Con confirmación activada, confirmar la cuenta por correo antes de ingresar.
5. Asignar el rol de administrador como se indica abajo. Desde Mi cuenta → Administrar productos, crear y editar el catálogo con fotos.

La app usa las API REST de Supabase sin dependencias adicionales. El servidor calcula precios y totales y descuenta inventario en una transacción SQL. El carrito envía identificadores y cantidades. Una clave de idempotencia conserva el mismo pedido al reintentar una solicitud interrumpida sin modificar el carrito.

### Administración de productos con fotografías

El panel **Administrar** permite crear y editar nombre, categoría, descripción, precio en COP, unidades disponibles, fotografía y color de fondo. La categoría se puede escribir libremente; se incorpora a los filtros del catálogo. Usa cero unidades para marcar un producto como agotado. Si el inventario cambia mientras editas, el guardado se detiene y pide actualizar el listado para evitar sobrescribir ventas recientes.

Para habilitarlo en Supabase:

1. Ejecutar el [schema.sql actualizado](../supabase/schema.sql) completo en el SQL Editor, incluso si ya ejecutaste la versión anterior. Añade `products.image_url`, crea el bucket público `product-images` y configura las políticas. Conserva los productos y pedidos existentes; los datos de ejemplo no reemplazan registros ya creados.
2. Registrarte desde la app y confirmar el correo.
3. Abrir [assign-admin.sql](../supabase/assign-admin.sql), sustituir `CAMBIA_ESTO_POR_TU_CORREO` por el correo de esa cuenta y ejecutar en el SQL Editor como propietario del proyecto. El script asigna `admin` en los metadatos de servidor del usuario indicado. No hay un registro público de administradores.
4. Cerrar sesión y volver a ingresar para recibir el rol en el JWT. Aparecerán la pestaña **Administrar** y el enlace **Administrar productos** en Mi cuenta.

Si aparece «No existe una cuenta con ese correo», el mensaje viene de `assign-admin.sql`, no de `schema.sql`. Comprueba en **Authentication → Users** del mismo proyecto que exista exactamente el correo indicado en `admin_email`. Si falta, crea la cuenta desde la aplicación conectada a Supabase o desde **Add user → Create new user** en ese panel, establece su contraseña y confirma el correo. Después vuelve a ejecutar `assign-admin.sql`. Las cuentas de demostración y la cuenta con la que accedes al panel de Supabase no crean por sí mismas un usuario de la tienda en `auth.users`.

El panel acepta JPG, PNG o WebP de hasta 5 MB, muestra una vista previa y exige fotografía al publicar un producto nuevo. Para productos existentes se puede mantener o reemplazar la imagen. Las fotos del catálogo son públicas y se almacenan en Supabase Storage; los productos solo guardan su URL. RLS permite escribir productos y objetos del bucket exclusivamente al rol `admin`, no a clientes ni a operadores de logística.

Cada reemplazo sube un archivo nuevo para evitar problemas de caché. Los archivos anteriores se conservan; se pueden depurar manualmente desde Storage cuando ya no estén referenciados. Si se interrumpe el guardado después de subir una foto, puede quedar un objeto sin producto asociado: revisar el listado antes de volver a publicar. El panel no elimina productos ni imágenes automáticamente.

Para probar sin Supabase: Mi cuenta → **Probar administración**. Se activa una cuenta administradora solo de demostración; catálogo y fotos se guardan en este dispositivo. Las imágenes grandes pueden agotar el almacenamiento local del navegador: usar fotos pequeñas para la demo. Este acceso está deshabilitado al configurar Supabase.

Verificación manual pendiente en Supabase: un administrador puede subir y crear/editar; clientes y operadores reciben una denegación si intentan hacerlo directamente por API. Las pruebas automáticas simulan respuestas REST y recorren la administración local, y no sustituyen esa comprobación de las políticas desplegadas.

### Clientes y logística

Los usuarios nuevos son clientes y solo consultan sus propios pedidos. Los roles `operator` y `admin` pueden ver todos los pedidos y confirmar su cobro presencial y entrega. Asignar roles **desde un entorno de servidor confiable**, con Supabase Admin API, mediante `app_metadata: { role: 'operator' }`. No usar `user_metadata` para autorizar. Volver a iniciar sesión tras asignar el rol para renovar el JWT.

Las rutas tienen guards y las tablas políticas RLS; la autorización real se ejecuta en Supabase. Los clientes no pueden escribir directamente en pedidos, alterar precios o marcar pagos. El catálogo es de lectura pública. La cuenta de demostración permite probar logística, y no existe en Supabase.

### Pagos y comprobantes

- **Demo:** compra simulada, sin cobro, con comprobante identificado sin valor fiscal.
- **Supabase:** pedido pendiente de pago con recogida en tienda. Un operador confirma explícitamente el cobro presencial y la entrega; el servidor registra el pago. No es un pago automático.
- **Pasarela online:** pendiente de elegir y conectar proveedor, entorno de pruebas, funciones de servidor y webhooks firmados. La aplicación no solicita ni guarda tarjetas. Una redirección del navegador no debe acreditar un pago.

El comprobante se consulta en Mis pedidos: referencia, fecha, productos, cantidades, total, estado y estado de pago. Una constancia pendiente no acredita el pago ni sustituye una factura fiscal.

### Persistencia

Preferences conserva carrito y caché del catálogo; Filesystem conserva imágenes. En demostración, también se conservan los pedidos locales. En modo conectado los pedidos residen en Supabase y no se guardan en caché local. Los tokens y contraseñas **no se escriben en Preferences**; la sesión se mantiene en memoria con renovación de token mientras la app permanezca abierta. Recargar o cerrar exige volver a ingresar. Para recordar sesiones entre reinicios hace falta integrar almacenamiento seguro del sistema operativo.

Las fotos de evidencias de entrega se guardan solo en el dispositivo y pueden asociarse a una referencia de pedido. No se suben a Supabase; el archivo local es compartido por los operadores que utilicen ese dispositivo. Las fotos previas de la galería se conservan. Borrar los datos de la app o desinstalarla elimina las evidencias locales. Las fotografías del catálogo, en cambio, se guardan en el bucket público `product-images` al conectar Supabase.

## Verificaciones

```sh
npm run lint
npm run test:unit
npm run test:e2e
npm run build
```

Playwright requiere Chromium (`npx playwright install chromium`), o Chrome local con `$env:PLAYWRIGHT_CHANNEL = 'chrome'` en PowerShell. Las pruebas web cubren búsqueda, filtros, detalles, carrito, compra simulada, comprobantes, persistencia, rutas protegidas y entrega simulada. Las pruebas con dobles de API y plugins no certifican un proyecto Supabase desplegado ni una cámara nativa.

## Preparar Android

```sh
npm run build
npx cap sync android
npx cap open android
```

En Android Studio, ejecutar en emulador o dispositivo y comprobar cámara y persistencia. Para APK/AAB firmado: Build → Generate Signed App Bundle / APK; crear/seleccionar un almacén de claves fuera del repositorio y conservar copia segura. No se ha generado ni firmado un binario de distribución. Para iOS se requiere macOS/Xcode, añadir `@capacitor/ios` y la plataforma, configurar el texto de permiso de cámara y compilar/firmar. La publicación depende de las cuentas de desarrollador.

Se conserva `com.actividad.galeriafotos` para mantener la continuidad de la instalación y sus fotos; el nombre visible es Nexo Tienda. Cambiar el identificador antes de una primera publicación si corresponde.

## Evidencias de la actividad

Registrar fecha, dispositivo, versión de Android/navegador y resultado real de cada caso. No copiar los resultados exitosos de las imágenes de referencia sin ejecutar las pruebas.

| Caso | Verificación automática | Validación externa pendiente |
| --- | --- | --- |
| PR-01 Autenticación | Guards web; acceso REST simulado | Registro/confirmación, cuentas reales, JWT y roles en Supabase |
| PR-02 API | Catálogo demo, respuestas y fallos REST simulados | Medir respuesta real, incluida la meta de menos de 2 segundos |
| PR-03 Carrito y pagos | Totales, simulación y flujo web | Transacción y concurrencia PostgreSQL; pasarela online aún no integrada |
| PR-04 Almacenamiento | Carrito/pedidos web; servicio de fotos | Persistencia nativa; sesión entre reinicios requiere almacén seguro |
| PR-05 Hardware | Dobles del plugin y acceso a evidencias | Captura real en Android/emulador, permisos y reapertura |

### Secuencia de capturas sugerida

1. Configuración de Ionic/Angular, Capacitor y plugins de cámara y almacenamiento.
2. Catálogo móvil y escritorio: búsqueda, categorías y detalle.
3. Carrito con dos unidades, total y recuperación después de recargar.
4. Demostración con su aviso explícito de compras sin cobros.
5. Confirmación simulada y comprobante con referencia, fecha y total.
6. Mis pedidos antes y después de registrar una entrega.
7. Evidencias con referencia; abrir cámara, capturar y confirmar.
8. Reabrir app nativa y verificar la fotografía.
9. Políticas RLS y funciones en Supabase; ocultar datos personales y claves privadas.
10. Dos clientes A y B: A no ve pedidos de B; un cliente no puede llamar a `mark_delivered`, insertar pedidos directamente ni modificar productos. Un operador autorizado sí puede confirmar cobro presencial y entrega.
11. Stock insuficiente y precio manipulado: el servidor debe rechazar cantidades inválidas y calcular su propio total.
12. Sin red: mostrar caché; el pedido real no se crea localmente ni aparece como pagado. Reintentar una solicitud interrumpida sin cambiar el carrito y comprobar que conserva su referencia.
13. Resultados de lint, pruebas unitarias, Playwright, compilación y sincronización Android.
14. App en emulador. Capturar la generación real del APK/AAB si se realiza; `cap sync` no prueba que exista un binario compilado.

| Caso manual | Resultado observado | Fecha/entorno | Evidencia |
| --- | --- | --- | --- |
| Registro/ingreso Supabase | Pendiente | | |
| Aislamiento de clientes | Pendiente | | |
| Logística y cobro presencial | Pendiente | | |
| API real y latencia | Pendiente | | |
| Stock y concurrencia SQL | Pendiente | | |
| Cámara nativa y persistencia | Pendiente | | |
| APK/AAB firmado | Pendiente | | |
| Pasarela de pago online | No integrada | | |

Los documentos `INFORME-BASE.md` y `GUIA-EVIDENCIAS.md` corresponden a la galería original. Para la tienda usar este documento y `INFORME-TIENDA.md`.
