# Render — "The Drop Nobody Has Ever Seen" (1440x2560 2K vertical, 30 fps, 67,0 s)

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
node scripts/render-pitch.mjs
```
Resultado: `remotion/out/pitch/final.mp4` (vídeo 1440x2560 + mezcla final).
- 1080x1920 en vez de 2K: `RES=1080 node scripts/render-pitch.mjs`
- Si va lento o sale negro, prueba otro modo de GPU: `GL=angle node scripts/render-pitch.mjs` (o `GL=swangle`, más lento pero seguro).
  En Windows PowerShell: `$env:GL="angle"; node scripts/render-pitch.mjs`

## 2b. En la nube (contenedor sin GPU, por trozos reanudables)
```
scripts/render_pitch.sh 0 15      # 16 trozos de 128 frames
scripts/finish_pitch.sh           # une, monta mix.wav y pasa el QA fotograma a fotograma
```

## 3. Ver antes de renderizar (opcional)
`npx remotion studio src/index.ts` → composición **PitchShort**.

## Notas
- El audio NO va dentro de Remotion: es `projects/pitch-drop/audio/mix.wav` y se monta al final.
- Regenerar el audio: `cd projects/pitch-drop/audio && python3 sound.py` (numpy/scipy, ~3 min). Si cambias tiempos en
  `story.ts` (FALLS, BUMP, POWER_OFF...), cambia también las constantes de `sound.py` y regenera.
- Voz: `projects/pitch-drop/voice/` (Kokoro `am_michael` 1.25, `make_voice.py` + `align.py`).
