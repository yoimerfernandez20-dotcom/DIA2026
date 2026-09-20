# Control de almacén — escáner de albaranes

PWA (Next.js + Tailwind) para comprobar que el código de cada producto que escaneas coincide con una línea del albarán.

## Uso

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests del parser y del matching
npm run build && npm start
```

Flujo: **Nuevo albarán** → elige el PDF (se lee en el propio dispositivo) → revisa/corrige las líneas → **Guardar y escanear**.

- **Lector Bluetooth/USB**: actúa como teclado; el campo de entrada siempre está enfocado, escanea y listo.
- **Cámara**: botón 📷. Requiere HTTPS (o `localhost`). Para probar en el móvil, despliega (p. ej. Vercel) o usa un túnel HTTPS.
- Resultado tras cada escaneo: **OK** (verde), **Sobrante** (ámbar, ya estaba completo) o **NO COINCIDE** (rojo), con pitido y vibración distintos.
- Si el producto trae un código distinto al del albarán (EAN frente a código interno de tienda), **Vincular a una línea** lo asocia y a partir de ahí se reconoce solo.
- Los datos se guardan en el navegador (localStorage). No hay servidor.

## Ajustar la lectura del PDF

`lib/parseAlbaran.ts` es una heurística: cada fila con un número de 6–14 cifras es un producto y la cantidad es el primer entero que aparece después. Si tu PDF real tiene otro formato, mira "Ver texto extraído del PDF" en la pantalla de importación y ajusta `isCodeToken`, `NON_PRODUCT_ROW` o la lógica de cantidad. Los PDF escaneados (imagen) no tienen texto: usa "pegar texto" o añade las líneas a mano.

## Estructura

- `lib/match.ts` — comparación de códigos (espacios, ceros a la izquierda, EAN/UPC/ITF-14), evaluación de escaneos, deshacer y vincular.
- `lib/parseAlbaran.ts`, `lib/parsePdf.ts` — de PDF a líneas del albarán.
- `components/ScanScreen.tsx`, `CameraScanner.tsx`, `ImportAlbaran.tsx`, `AlbaranList.tsx` — interfaz.
