// Run with node scripts/make-placeholders.mjs from any working directory.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const { themes } = JSON.parse(
  await readFile(new URL("data/defaults.json", root), "utf8"),
);
const washes = {
  classic: ["#e8e9d8", "#b5c1a5", "#506752", "#889c7e"],
  valentines: ["#f5ddd9", "#dda9ad", "#7e4553", "#bd7e88"],
  spring: ["#e6ecd6", "#bfcfb2", "#556f53", "#a6af98"],
  summer: ["#f6e8be", "#e0c993", "#605d40", "#a89c68"],
  fall: ["#efddbc", "#d0b17e", "#715134", "#ad8e5d"],
  halloween: ["#dbd2da", "#aa9cae", "#513d54", "#8e798d"],
  thanksgiving: ["#efdcce", "#d8b39c", "#784d49", "#b38370"],
  christmas: ["#dce6d8", "#a5bca9", "#345a49", "#7b9882"],
};
const neutralGallery = [
  ["#f2e3cf", "#d6b99b", "#795e49", "#b29a7c"],
  washes.classic,
  ["#eadbd1", "#cca69a", "#825849", "#ad8173"],
  ["#e6e3d5", "#c4bda6", "#635e4f", "#9f9a85"],
  ["#e0e6da", "#afbeac", "#4b6352", "#829983"],
  ["#f0e1d5", "#d1b59e", "#79614e", "#b0977e"],
];
const xml = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
function botanical() {
  let leaves = "";
  for (let i = 0; i < 7; i++) {
    const y = 48 + i * 34,
      x = Math.sin((i / 8) * Math.PI) * 19;
    for (const side of [-1, 1]) {
      const scale = 0.56 + Math.sin((i / 7) * Math.PI) * 0.43;
      leaves += `<g transform="translate(${x} ${y + side * 6}) scale(${side * scale} ${scale})"><path d="M0 1Q8-34 57-48Q48-8 0 1Z" fill="currentColor" fill-opacity=".22"/><path d="M0 1Q23-16 57-48M20-16l3-12m9 1 10-3" stroke-width="1" /></g>`;
    }
  }
  return `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M0 308Q32 177 0 0"/>${leaves}<path d="M0 35Q-17 14 0-10Q18 13 0 35Z" fill="currentColor" fill-opacity=".2"/></g>`;
}
const seasonal = {
  valentines: '<path d="M0 24C-57-12-26-41 0-15C26-41 57-12 0 24Z"/>',
  spring:
    '<g><path d="M0 11Q-33-10-18-32L-5-19 0-38 9-17 22-29Q30-4 0 11ZM0 11v33m0-13q-17-1-21-16 15 2 21 16Z"/></g>',
  summer:
    '<circle r="17"/>' +
    Array.from(
      { length: 12 },
      (_, i) => `<path transform="rotate(${i * 30})" d="M0-23v-10"/>`,
    ).join(""),
  fall: '<path d="M-2 31Q-8 10-23 3l7-1-10-16 15 7-2-17 9 8 6-20 7 21 10-9-4 22 15-5-9 15 6 1Q11 19 2 22l-4 9ZM0 25 2-18"/>',
  halloween:
    '<g><ellipse rx="28" ry="23"/><ellipse rx="16" ry="23"/><ellipse rx="6" ry="23"/><path d="M0-23q0-14 9-15l-2 8-6 8"/></g>',
  thanksgiving:
    '<path d="M0 35Q-24 19-26 1l13 9Q-27-8-22-21l15 13q-8-18 6-30 17 14 11 30l15-12Q28-4 11 12l16-6Q23 23 3 27L0 35ZM0 29V-22"/>',
  christmas: Array.from(
    { length: 6 },
    (_, i) =>
      `<path transform="rotate(${i * 60})" d="M0 0V-32M0-15l-8-7m8 7 8-7M0-24l-6-6m6 6 6-6"/>`,
  ).join(""),
};
const camera =
  '<path d="M-33-13h13l6-10h27l7 10h13q5 0 5 6v32q0 6-5 6h-66q-5 0-5-6V-7q0-6 5-6Z"/><circle cy="7" r="12"/><circle cx="26" cy="-3" r="2" fill="currentColor" stroke="none"/>';

function illustration(theme, slot, w, h) {
  const index = slot === "hero" ? 0 : Number(slot.split("-")[1]);
  const [light, dark, ink, mid] =
    theme.id === "classic" && index
      ? neutralGallery[index - 1]
      : washes[theme.id];
  const unit = Math.min(w, h) / 820,
    label = `${theme.name} · ${index ? "Gallery " + index : "Hero image"}`;
  const sprig = (x, y, angle, scale, mirror) =>
    `<use href="#sprig" transform="translate(${w * x} ${h * y}) rotate(${angle}) scale(${scale * unit * (mirror ? -1 : 1)} ${scale * unit})"/>`;
  const ornaments = seasonal[theme.id]
    ? [
        [0.13, 0.23, -17],
        [0.84, 0.67, 19],
        [0.8, 0.19, -9],
      ]
        .map(
          ([x, y, angle]) =>
            `<use href="#motif" transform="translate(${w * x} ${h * y}) rotate(${angle}) scale(${unit * 0.76})"/>`,
        )
        .join("")
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc">
  <title id="title">YOUR PHOTO HERE</title><desc id="desc">${xml(label)}</desc>
  <defs>
    <linearGradient id="wash" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <pattern id="paper" width="13" height="17" patternUnits="userSpaceOnUse"><circle cx="2" cy="9" r=".8" fill="${ink}" opacity=".14"/><circle cx="9" cy="3" r=".65" fill="#fff" opacity=".55"/></pattern>
    <g id="sprig">${botanical()}</g><g id="motif" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${seasonal[theme.id] || ""}</g>
  </defs>
  <rect width="100%" height="100%" fill="url(#wash)"/>
  <circle cx="${w * 0.52}" cy="${h * 0.47}" r="${h * 0.265}" fill="${light}" opacity=".5"/>
  <circle cx="${w * 0.52}" cy="${h * 0.47}" r="${h * 0.286}" fill="none" stroke="${ink}" stroke-width="1" opacity=".22"/>
  <g fill="${mid}"><path d="M0 ${h * 0.75}Q${w * 0.22} ${h * 0.65} ${w * 0.47} ${h * 0.79}T${w} ${h * 0.65}V${h}H0Z" opacity=".22"/><path d="M0 ${h * 0.84}Q${w * 0.19} ${h * 0.66} ${w * 0.54} ${h * 0.89}Q${w * 0.79} ${h * 0.73} ${w} ${h * 0.76}V${h}H0Z" opacity=".38"/><path d="M0 ${h * 0.92}Q${w * 0.23} ${h * 0.82} ${w * 0.53} ${h * 0.94}T${w} ${h * 0.86}V${h}H0Z" opacity=".54"/></g>
  <g color="${ink}" opacity=".64">${sprig(0.025, 0.34, -23, 2.3, false)}${sprig(0.19, 0.68, 26, 1.43, true)}${sprig(0.96, 0.38, 151, 1.6, true)}${sprig(0.82, 0.12, -127, 1.14, false)}${ornaments}</g>
  <rect width="100%" height="100%" fill="url(#paper)"/>
  <rect x="2.6%" y="3.5%" width="94.8%" height="93%" rx="2" fill="none" stroke="${ink}" opacity=".62" stroke-width="${unit * 1.7}" stroke-dasharray="${unit * 8} ${unit * 7}"/>
  <g transform="translate(${w * 0.5} ${h * 0.43}) scale(${unit})" color="${ink}" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">${camera}</g>
  <g fill="${ink}" text-anchor="middle" font-family="Arial, sans-serif"><text x="50%" y="54%" font-size="${unit * 34}" font-weight="600" letter-spacing="${unit * 5}">YOUR PHOTO HERE</text><text x="50%" y="60%" font-family="Georgia, serif" font-size="${unit * 28}" font-style="italic">${xml(label)}</text></g>
</svg>\n`;
}
for (const theme of themes) {
  const folder = new URL(`assets/img/themes/${theme.id}/`, root);
  await mkdir(folder, { recursive: true });
  const sizes = [
    [1600, 900],
    [800, 1000],
    [900, 900],
    [1050, 700],
    [1050, 700],
    [800, 1000],
    [900, 900],
  ];
  for (const [index, [width, height]] of sizes.entries()) {
    const slot = index === 0 ? "hero" : "gallery-" + index;
    await writeFile(
      new URL(slot + ".svg", folder),
      illustration(theme, slot, width, height),
    );
  }
}
