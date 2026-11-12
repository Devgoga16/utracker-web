# App de Android

La app es esta misma web empaquetada con [Capacitor](https://capacitorjs.com).
Todo lo que se cambia en `src/` llega a la app la próxima vez que se genera el
APK; no hay una segunda interfaz que mantener.

- Va siempre contra la API de producción (`https://utracker-api.unify-tc.com`).
  Para probar contra otra, compila con `VITE_NATIVE_API_URL`.
- Los links que se comparten con clientes (tienda, seguimiento, campañas,
  invitaciones) salen con `https://utracker.unify-tc.com`, no con el origen
  interno de la app. Se cambia con `VITE_PUBLIC_WEB_URL`.
- La API acepta el origen de la app (`https://app.utracker`) sin tocar
  `CORS_ORIGIN`: está fijo en `config/env.ts`.

## Requisitos (una sola vez)

- [Android Studio](https://developer.android.com/studio), que trae el SDK y
  el JDK 21 que pide Capacitor 8.
- Node, como para la web.

## Generar el APK

```bash
npm run android
```

Compila la web y la copia al proyecto `android/`. Después:

```bash
npm run android:open
```

Se abre Android Studio. Ahí:

- **Probar en el celular**: conéctalo por USB con la depuración USB activada y
  dale a ▶ Run.
- **APK para instalar**: *Build → Generate App Bundles or APKs → Generate
  APKs*. Queda en `android/app/build/outputs/apk/debug/app-debug.apk`; se pasa
  al celular y se instala (Android pide permitir «orígenes desconocidos»).
- **APK firmado** (para repartir o subir a Play Store): *Build → Generate
  Signed App Bundle or APK*. Guarda el archivo `.jks` y sus contraseñas fuera
  del repo: sin ellos no se puede publicar una actualización de la misma app.

Sin Android Studio abierto, también sale por consola:

```bash
cd android
.\gradlew.bat assembleDebug
```

## Qué tiene de nativo

- **Atajos del ícono**: mantener presionado → Vender, Nuevo pedido, Pedidos,
  Hoy. Están en `android/app/src/main/res/xml/shortcuts.xml` y abren
  `utracker://app/...`, que la web recibe en `src/lib/nativeShell.ts`.
- Abre directo en **Hoy** (o en el login), sin pasar por la landing.
- Ícono y pantalla de carga con el logo de uTracker.

## Al actualizar la app

Cambia `versionCode` (+1) y `versionName` en `android/app/build.gradle` antes
de generar el APK: Android no instala encima una versión con el mismo número.
