// Render final de "The Ship Made of Ice" en 1080x1920 y montaje con la mezcla de audio.
// Uso (desde la carpeta remotion/):  node scripts/render-ice.mjs
// Opcional: GL=angle|swangle|egl  (por defecto lo elige Remotion; en PC con GPU suele ir bien "angle")
import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";

const run = (cmd) => { console.log("\n> " + cmd + "\n"); execSync(cmd, { stdio: "inherit" }); };
mkdirSync("out/ice", { recursive: true });

const gl = process.env.GL ? ` --gl ${process.env.GL}` : "";
run(`npx remotion render src/index.ts IceShort out/ice/video.mp4 --codec h264 --crf 16 --timeout 240000${gl}`);

const mix = "../ice-short/audio/mix.wav";
if (!existsSync(mix)) throw new Error("No encuentro " + mix);
run(`npx remotion ffmpeg -y -i out/ice/video.mp4 -i ${mix} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest out/ice/final.mp4`);
console.log("\nListo: remotion/out/ice/final.mp4");
