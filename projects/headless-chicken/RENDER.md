# Render — "The Chicken That Lived Without a Head" (1440x2560 2K vertical, 30 fps, 71,0 s)

Todo está en el repo `irrt3000/claude-animated-shorts`, rama `ccr-7ffa0f75-cd9ulc`.

## 1. Bajar el proyecto
```
git clone https://github.com/irrt3000/claude-animated-shorts.git
cd claude-animated-shorts
git checkout ccr-7ffa0f75-cd9ulc
cd remotion
npm install
```
Necesitas Node 18+ (Remotion descarga su propio Chrome y trae ffmpeg).

## 2. Renderizar + poner el audio (un solo comando)
```
node scripts/render-chicken.mjs
```
Resultado: `remotion/out/chicken/final.mp4` (vídeo 1440x2560 + mezcla final).
- 1080x1920 en vez de 2K: `RES=1080 node scripts/render-chicken.mjs`
- Si va lento o sale negro, prueba otro modo de GPU: `GL=angle node scripts/render-chicken.mjs` (o `GL=swangle`, más lento pero seguro).
  En Windows PowerShell: `$env:GL="angle"; node scripts/render-chicken.mjs`
- Con los otros cinco: `node scripts/render-all.mjs` (o `ONLY=chicken`).

## 2b. En la nube (contenedor sin GPU, por trozos reanudables)
```
scripts/render_chicken.sh 0 16       # 17 trozos de 128 frames
scripts/finish_chicken.sh           # une, monta mix.wav y pasa el QA fotograma a fotograma
```

## 3. Ver antes de renderizar (opcional)
`npx remotion studio src/index.ts` → composición **ChickenShort**.

## Notas
- El audio NO va dentro de Remotion: es `projects/headless-chicken/audio/mix.wav` y se monta al final.
- Regenerar el audio: `cd projects/headless-chicken/audio && python3 sound.py` (numpy/scipy, ~10 min). Si cambias tiempos en
  `story.ts` (JAW, WHOOSH, SHOOK, DROP, SNAP, EIGHT, CHOKE...), cambia también las constantes de `sound.py`.
- Voz: `projects/headless-chicken/voice/` (Kokoro `am_michael` 1.25, `make_voice.py` + `align.py`).
