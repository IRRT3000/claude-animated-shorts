// Render final de "The Summer Everyone Danced" en 2K vertical (1440x2560) y montaje con la mezcla de audio.
// Uso (desde la carpeta remotion/):  node scripts/render-dance.mjs
// Opcional: GL=angle|swangle|egl  (en PC con GPU suele ir bien "angle")   RES=1080 para 1080x1920
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";

const run = (cmd) => { console.log("\n> " + cmd + "\n"); execSync(cmd, { stdio: "inherit" }); };
mkdirSync("out/dance", { recursive: true });

const gl = process.env.GL ? ` --gl ${process.env.GL}` : "";
const scale = process.env.RES === "1080" ? "" : " --scale 1.3333333333333333"; // exacto 4/3: 1440x2560
run(`npx remotion render src/index.ts DanceShort out/dance/video.mp4 --codec h264 --crf 16 --timeout 240000${scale}${gl}`);

const mix = "../projects/dancing-plague/audio/mix.wav";
if (!existsSync(mix)) throw new Error("No encuentro " + mix);
run(`npx remotion ffmpeg -y -i out/dance/video.mp4 -i ${mix} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/dance/final.mp4`);
console.log("\nListo: remotion/out/dance/final.mp4");
