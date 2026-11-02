# Studio: proyecto Remotion listo para la skill

Proyecto Remotion + three.js ya montado con el corto de ejemplo ("The Bridge That Fell for a Song") en `src/videos/bridge/`.
Verificado: renderiza stills correctamente (frame 100).

## Primer uso (en tu PC, con GPU)
```bash
cd studio
npm install
pip install -r requirements.txt        # solo para el audio
export REMOTION_TMP=/ruta/disco/grande/remotion-tmp   # cada bundle copia public/ (~1.3 GB)
node scripts/bridge-stills.mjs out/bridge/x_ 100,400,900 0.5   # stills de prueba
npm run studio                          # vista previa en el navegador
npm run render                          # video final 1440x2560 (~10 min por 67 s con GPU)
```
Chrome: el script busca `$CHROME_PATH`, Chrome en Windows/macOS/Linux o `/opt/pw-browsers/chromium`.

## Assets que faltan (opcional pero recomendado)
Descarga los kits CC0 de https://kenney.nl (Nature Kit, etc.) y copia los `.glb` a `public/bridge/kenney/`
(nombres en `KENNEY` de `src/videos/bridge/world.ts`). Sin ellos el corto renderiza igual, solo sin árboles/puestos/molino.

## Crear un short nuevo
1. Copia `src/videos/bridge/` a `src/videos/<nombre>/` y registra la composición en `src/Root.tsx`.
2. Sigue el pipeline de `../SKILL.md` (tema -> guion -> voz -> story.ts -> stills -> sonido -> render).
3. En Claude Code: "Use the cartoon short skill and make a short about ...".

## Nota
En contenedores sin GPU un still tarda ~2 min (WebGL por software). Úsalo para revisar frames, no para el render final.
