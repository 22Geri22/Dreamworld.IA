# DreamWorld AI v0.5 — paquete de proyecto corregido

Proyecto Expo/React Native en español para una aventura narrativa local. Esta entrega es el **código fuente**, no una APK.

## Incluye
- Crear historias y protagonistas.
- Escenas de demostración con decisiones y consecuencias.
- Biblioteca y guardado local de partidas.
- Relación, pistas, inventario y memoria narrativa de Nara.
- Fichas de personaje locales y descripción visual preparada.
- Tema claro/oscuro.
- Sin cuentas, anuncios, compras, tokens ni llamadas a servicios externos.

## Limitaciones actuales
- El motor narrativo es una aventura de demostración preescrita, no un modelo de IA generativa.
- No genera ilustraciones todavía. Las fichas visuales son descripciones; no hay retratos ni fondos generados.
- No hay APK incluida en este ZIP.

## Compilar una APK
Se necesita Node.js/npm y una cuenta Expo/EAS para la compilación en la nube. Las condiciones y límites de EAS pueden cambiar.

```bash
npm install
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

El perfil `preview` está configurado para producir APK. Al terminar EAS proporciona un enlace para descargarla e instalarla en Android.

## Datos
Las partidas se guardan localmente en el dispositivo mediante AsyncStorage. No introduzcas claves API privadas en la app.
