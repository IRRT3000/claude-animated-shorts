# Render — "The Rats That Kept Their Lives" (1440x2560 2K vertical, 30 fps, 67,0 s)

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
node scripts/render-rats.mjs
```
Resultado: `remotion/out/rats/final.mp4` (vídeo 1440x2560 + mezcla final).
- 1080x1920 en vez de 2K: `RES=1080 node scripts/render-rats.mjs`
- Si va lento o sale negro, prueba otro modo de GPU: `GL=angle node scripts/render-rats.mjs` (o `GL=swangle`, más lento pero seguro).
  En Windows PowerShell: `$env:GL="angle"; node scripts/render-rats.mjs`
- Con los otros cuatro: `node scripts/render-all.mjs` (o `ONLY=rats`).

## 2b. En la nube (contenedor sin GPU, por trozos reanudables)
```
scripts/render_rats.sh 0 15       # 16 trozos de 128 frames
scripts/finish_rats.sh           # une, monta mix.wav y pasa el QA fotograma a fotograma
```

## 3. Ver antes de renderizar (opcional)
`npx remotion studio src/index.ts` → composición **RatShort**.

## Notas
- El audio NO va dentro de Remotion: es `projects/rat-tails/audio/mix.wav` y se monta al final.
- Regenerar el audio: `cd projects/rat-tails/audio && python3 sound.py` (numpy/scipy, ~10 min). Si cambias tiempos en
  `story.ts` (PAID, POP, JUMP, EVERYONE, SNIP, SCRAP, ONE...), cambia también las constantes de `sound.py`.
- Voz: `projects/rat-tails/voice/` (Kokoro `am_michael` 1.25, `make_voice.py` + `align.py`).
