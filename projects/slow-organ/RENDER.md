# Render — "The Song That Ends in 2640" (1440x2560 2K vertical, 30 fps, 68,0 s)

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
node scripts/render-organ.mjs
```
Resultado: `remotion/out/organ/final.mp4` (vídeo 1440x2560 + mezcla final).
- 1080x1920 en vez de 2K: `RES=1080 node scripts/render-organ.mjs`
- Si va lento o sale negro, prueba otro modo de GPU: `GL=angle node scripts/render-organ.mjs` (o `GL=swangle`, más lento pero seguro).
  En Windows PowerShell: `$env:GL="angle"; node scripts/render-organ.mjs`

## 2b. En la nube (contenedor sin GPU, por trozos reanudables)
```
scripts/render_organ.sh 0 15      # 16 trozos de 128 frames
scripts/finish_organ.sh           # une, monta mix.wav y pasa el QA fotograma a fotograma
```

## 3. Ver antes de renderizar (opcional)
`npx remotion studio src/index.ts` → composición **OrganShort**.

## Notas
- El audio NO va dentro de Remotion: es `projects/slow-organ/audio/mix.wav` y se monta al final.
- Regenerar el audio: `cd projects/slow-organ/audio && python3 sound.py` (numpy/scipy, ~10 min). Si cambias tiempos en
  `story.ts` (SWITCH, WEIGHT, ADD_PIPE, FIRST_NOTE...), cambia también las constantes de `sound.py` y regenera.
- Voz: `projects/slow-organ/voice/` (Kokoro `am_michael` 1.25, `make_voice.py` + `align.py`).
