/**
 * Ajoute la musique et les bruitages à la vidéo rendue (muette).
 *
 * Les instants sont calculés à partir du découpage réel de la vidéo
 * (durées de scène + durée des transitions du style) : le « whoosh » tombe
 * sur chaque changement d'offre et le « ding » à l'apparition de chaque prix,
 * quel que soit le style. La musique démarre sur le drop du morceau et
 * s'éteint en fondu sur les 2,5 dernières secondes de la vidéo.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const FPS = 30;
const INTRO = 80, DEAL = 130, OUTRO = 110, N = 5;
const TRANSITION = { adidas: 16, zara: 32, nike: 12 };
const STAGGER = { adidas: 1, zara: 1.6, nike: 0.75 };
const PRICE_DELAY = 22 + 8; // TIMING.secondaryDelay + 8 (DealScene)
const MUSIC_DROP = 9.3;     // secondes : début du passage rythmé de lofi-bg.mp3

export function audioCues(style) {
  const T = TRANSITION[style] ?? 16;
  const dealStart = (i) => INTRO - T + i * (DEAL - T);
  const total = INTRO + N * DEAL + OUTRO - (N + 1) * T;
  const transitions = [...Array(N + 1).keys()].map((i) => dealStart(i) / FPS);
  const reveals = [...Array(N).keys()].map((i) => (dealStart(i) + PRICE_DELAY * (STAGGER[style] ?? 1)) / FPS);
  return { duration: total / FPS, transitions, reveals };
}

export function mixAudio({ rawVideo, output, style, audioDir }) {
  const music = path.join(audioDir, "lofi-bg.mp3");
  const whoosh = path.join(audioDir, "whoosh.mp3");
  const ding = path.join(audioDir, "ding.mp3");
  if (![music, whoosh, ding].every((f) => fs.existsSync(f))) throw new Error("fichiers audio absents");

  const { duration, transitions, reveals } = audioCues(style);
  const ms = (s) => Math.round(s * 1000);
  const fadeOut = Math.max(0, duration - 2.5).toFixed(2);
  const filter = [
    `[1:a]atrim=${MUSIC_DROP}:${(MUSIC_DROP + duration).toFixed(2)},asetpts=PTS-STARTPTS,volume=0.55,afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOut}:d=2.5[music]`,
    `[2:a]asplit=${transitions.length}${transitions.map((_, i) => `[wi${i}]`).join("")}`,
    ...transitions.map((t, i) => `[wi${i}]atrim=0:1.0,asetpts=PTS-STARTPTS,lowpass=f=3000,volume=0.4,adelay=${ms(t)}|${ms(t)}[w${i}]`),
    `[3:a]asplit=${reveals.length}${reveals.map((_, i) => `[di${i}]`).join("")}`,
    ...reveals.map((t, i) => `[di${i}]atrim=0:0.8,asetpts=PTS-STARTPTS,lowpass=f=4000,volume=0.3,adelay=${ms(t)}|${ms(t)}[d${i}]`),
    `[music]${transitions.map((_, i) => `[w${i}]`).join("")}${reveals.map((_, i) => `[d${i}]`).join("")}amix=inputs=${1 + transitions.length + reveals.length}:duration=first:normalize=0,volume=1.8,loudnorm=I=-14:TP=-1:LRA=11[audio]`,
  ].join(";");
  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", rawVideo, "-i", music, "-i", whoosh, "-i", ding,
    "-filter_complex", filter,
    "-map", "0:v", "-map", "[audio]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", duration.toFixed(2), output,
  ], { stdio: "inherit" });

  // Contrôle : une vraie piste audio, de la bonne durée, et pas silencieuse.
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", output]).toString());
  if (!probe.streams.some((s) => s.codec_type === "audio")) throw new Error("piste audio absente après le mixage");
  return { duration, transitions, reveals };
}
