// Renderiza los 3 vídeos seguidos (2K 1440x2560 + audio): reloj de Cox, pitch drop y órgano.
// Uso (desde la carpeta remotion/):  node scripts/render-all.mjs
// Opcional: GL=angle (PC con GPU)   RES=1080 para 1080x1920   ONLY=organ,pitch para elegir cuáles
import { execSync } from "node:child_process";
const all = ["cox", "pitch", "organ"];
const pick = process.env.ONLY ? process.env.ONLY.split(",") : all;
for (const v of all.filter((x) => pick.includes(x))) {
  console.log(`\n===== ${v} =====`);
  execSync(`node scripts/render-${v}.mjs`, { stdio: "inherit", env: process.env });
}
console.log("\nTerminado: remotion/out/cox/final.mp4, remotion/out/pitch/final.mp4, remotion/out/organ/final.mp4");
