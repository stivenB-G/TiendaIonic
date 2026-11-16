# Nexo: aplicación móvil híbrida de tienda online

Borrador académico. Completar datos, figuras, citas, pruebas externas y resultados antes de entregar.

Autor: [Nombre]  
Institución: [Institución]  
Asignatura y docente: [Completar]  
Fecha: [Completar]

## 1. Introducción del proyecto

Nexo adapta un proyecto Ionic/Angular y Capacitor de galería fotográfica a una tienda online. La aplicación presenta un catálogo con búsqueda y categorías, carrito, cuentas de usuario, consulta de pedidos y evidencias de entrega. La arquitectura distingue una demostración local de la integración con Supabase.

El modo de demostración permite evaluar la interacción sin credenciales externas. En modo conectado, Supabase gestiona autenticación, catálogo e inventario, y almacena pedidos mediante operaciones transaccionales. Los clientes consultan sus propios pedidos y los operadores de logística pueden confirmar el cobro presencial y la entrega.

## 2. Estrategia de pruebas

Las pruebas unitarias verifican cálculos, almacenamiento, restricciones del carrito y comportamiento de servicios con respuestas simuladas. Playwright recorre el catálogo, los detalles, el carrito persistente, la compra simulada, la consulta del comprobante y los guards de navegación. Estas verificaciones deben complementarse con pruebas reales de RLS, cuentas de Supabase, concurrencia SQL y cámara nativa en Android.

Insertar resultados de comandos y las capturas indicadas en `GUIA-TIENDA.md`. La sincronización de Capacitor prepara los archivos nativos; no demuestra la generación de un APK/AAB firmado ni su ejecución.

## 3. Proceso de pruebas y resultados

Completar PR-01 a PR-05 con la tabla de `GUIA-TIENDA.md`, indicando resultados observados, fecha, entorno y limitaciones. Para pruebas de API, registrar mediciones reales antes de afirmar que se responde en menos de dos segundos. Para pagos, distinguir la simulación, el pago presencial confirmado por un operador y una pasarela online.

## 4. Seguridad y preparación del lanzamiento

El cliente no contiene claves de servidor ni almacena contraseñas o tarjetas. La sesión se mantiene en memoria y se renueva mientras la aplicación está abierta. Recordar sesiones entre reinicios requiere integrar un almacén seguro nativo. Preferences conserva el carrito y el catálogo, y Filesystem conserva las evidencias locales.

Las políticas RLS impiden consultar pedidos ajenos salvo a roles de logística. Los roles se obtienen de `app_metadata` administrado desde el servidor. La función de creación de pedidos valida cantidades, consulta precios en la base de datos, bloquea inventario y procesa reintentos mediante un identificador de solicitud. La confirmación presencial de pago y entrega requiere un operador autorizado.

La integración se comunica mediante HTTPS. Las evidencias no se suben al servidor y se pierden al borrar los datos del dispositivo. La pasarela online, los webhooks de pago, el almacenamiento seguro de sesión, la distribución iOS y la firma/publicación de binarios quedan pendientes. Documentar la compilación real de producción y las pruebas nativas realizadas antes de afirmar que la app está lista para producción.

## 5. Conclusiones y objetivos alcanzados

Se implementó el flujo de tienda y una demostración que permite revisar catálogo, carrito, pedido, comprobante y entrega. Se prepararon la autenticación y las operaciones de Supabase con autorización en servidor. La validación externa y la integración de una pasarela siguen siendo necesarias para completar el alcance comercial y los casos de prueba de las imágenes de referencia.

[Añadir aprendizajes, resultados medidos, figuras y referencias de las fuentes realmente consultadas. Trasladar a un procesador de texto, aplicar formato institucional/APA y exportar a PDF.]
