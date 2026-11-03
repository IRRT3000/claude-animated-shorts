# Render en casa — "The Ship Made of Ice" (1080x1920, 30 fps, 69,3 s)

Todo está en el repo `irrt3000/claude-animated-shorts`, rama `ccr-2b60f901-hbrmy8`.

## 1. Bajar el proyecto
```
git clone https://github.com/irrt3000/claude-animated-shorts.git
cd claude-animated-shorts
git checkout ccr-2b60f901-hbrmy8
cd remotion
npm install
```
Necesitas Node 18+ (Remotion descarga su propio Chrome y trae ffmpeg).

## 2. Renderizar + poner el audio (un solo comando)
```
node scripts/render-ice.mjs
```
Resultado: `remotion/out/ice/final.mp4` (vídeo 1080x1920 + mezcla final).
Si va lento o sale negro, prueba otro modo de GPU:
- Windows PowerShell: `$env:GL="angle"; node scripts/render-ice.mjs`
- Mac/Linux: `GL=angle node scripts/render-ice.mjs` (o `GL=swangle`, más lento pero seguro)

## 3. Ver antes de renderizar (opcional)
`npx remotion studio src/index.ts` → composición **IceShort**.

## Notas
- Los avisos 404 de modelos `.glb` (props Kenney) son normales, no afectan.
- El audio NO va dentro de Remotion: es `ice-short/audio/mix.wav` y se monta al final.
- Para regenerar el audio: `cd ice-short/audio && python mix.py` (necesita numpy/scipy).
- 2K opcional: añade `--scale 1.3333333333333333` (exacto, si no la altura no sale entera).
