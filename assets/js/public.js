import { get, ready, subscribe } from "./store.js";
import { descriptions, packagePhotos } from "./sample-photos.js";
import { applyTheme, activeTheme } from "./themes.js";
import {
  activeSale,
  quote,
  countdown,
  money,
  discountLabel,
} from "./pricing.js";
import { createLead } from "./contracts.js";
import { openSheet, esc, closeSheet } from "./ui.js";
const $ = (id) => document.getElementById(id);
const embedded = window.self !== window.top;
document.documentElement.classList.toggle("embedded", embedded);
let override = new URLSearchParams(location.search).get("preview"),
  current,
  photoIndex = 0,
  galleryKey = "",
  lastTick = "";
function showPhoto(index) {
  photoIndex = (index + 6) % 6;
  $("light-photo").src = current.images.gallery[photoIndex];
  $("light-photo").alt =
    descriptions[current.images.gallery[photoIndex]] ||
    current.name + " session photograph";
  $("light-count").textContent = photoIndex + 1 + " / 6";
}
function render() {
  const s = get();
  current = s.themes.find((t) => t.id === override) || activeTheme(s);
  applyTheme(current);
  const headline = current.headline.trim();
  const split = headline.includes("\n")
    ? headline.indexOf("\n")
    : headline.includes(",")
      ? headline.indexOf(",") + 1
      : -1;
  $("headline").innerHTML =
    split < 0
      ? esc(headline)
      : esc(headline.slice(0, split)) +
        "<br><em>" +
        esc(headline.slice(split).trim()) +
        "</em>";
  for (const id of ["tagline", "subline", "cta"])
    $(id).textContent = current[id].replace(/\s*→$/, "");
  document.querySelector(".studio-name").textContent =
    s.settings.businessName.replace(/\s+Photography$/i, "");
  $("hero-img").src = current.images.hero;
  $("hero-img").alt =
    descriptions[current.images.hero] || current.name + " session photograph";
  $("collection-name").textContent = "The " + current.name + " Collection";
  $("gallery-theme").textContent = current.name;
  const key = JSON.stringify(current.images.gallery);
  if (key !== galleryKey) {
    galleryKey = key;
    $("gallery-grid").innerHTML = current.images.gallery
      .map(
        (src, i) =>
          '<button type="button" aria-label="Open gallery photo ' +
          (i + 1) +
          " · " +
          esc(descriptions[src] || current.name) +
          '"><img loading="lazy" src="' +
          esc(src) +
          '" alt="' +
          esc(descriptions[src] || current.name + " session photograph") +
          '"></button>',
      )
      .join("");
    if ($("lightbox").open) showPhoto(photoIndex);
  }
  const sale = activeSale(s);
  $("banner").hidden = !sale;
  $("banner").textContent = sale
    ? (sale.banner || sale.name + " — " + discountLabel(sale)) +
      (sale.countdown ? " · " + countdown(sale) : "")
    : "";
  const packages = s.packages.filter((p) => p.visible);
  $("package-list").innerHTML = packages
    .map((p) => {
      const q = quote(p, s);
      const image = Object.hasOwn(packagePhotos, p.id) && packagePhotos[p.id];
      return (
        '<article class="package-card">' +
        (image
          ? '<img class="package-photo" loading="lazy" src="' +
            esc(image) +
            '" alt="' +
            esc(descriptions[image]) +
            '">'
          : "") +
        (q.sale ? '<span class="badge">Sale</span> ' : "") +
        (p.featured ? '<span class="badge">Featured</span>' : "") +
        "<h3>" +
        esc(p.name) +
        "</h3><p>" +
        esc(p.description) +
        '</p><div class="price">' +
        (q.sale ? "<del>" + money(q.original) + "</del> " : "") +
        (p.pricePrefix ? esc(p.pricePrefix) + " " : "") +
        money(q.price) +
        (p.unit ? " <small>/ " + esc(p.unit) + "</small>" : "") +
        "</div><ul>" +
        p.includes.map((i) => "<li>" + esc(i) + "</li>").join("") +
        '</ul><a href="#inquiry" data-pkg="' +
        esc(p.id) +
        '">Inquire about this session</a></article>'
      );
    })
    .join("");
  const choice = $("inquiry-package").value;
  $("inquiry-package").innerHTML =
    '<option value="">Select a package</option>' +
    packages
      .map(
        (p) =>
          '<option value="' +
          esc(p.id) +
          '">' +
          esc(p.name) +
          " · " +
          (p.pricePrefix ? esc(p.pricePrefix) + " " : "") +
          money(quote(p, s).price) +
          "</option>",
      )
      .join("");
  if (packages.some((p) => p.id === choice))
    $("inquiry-package").value = choice;
  $("copyright").textContent =
    "© " + new Date().getFullYear() + " " + s.settings.businessName;
  $("theme-switch").hidden = !s.settings.showSwitcher || embedded;
}
await ready;
const overlay = document.createElement("div");
overlay.className = "seasonal-overlay";
overlay.setAttribute("aria-hidden", "true");
document.querySelector(".hero").prepend(overlay);
render();
subscribe(render);
setInterval(() => {
  const s = get(),
    sale = activeSale(s),
    key = new Date().toDateString() + "|" + (sale?.id || "");
  if (key !== lastTick) {
    lastTick = key;
    render();
  } else if (sale?.countdown)
    $("banner").textContent =
      (sale.banner || sale.name + " — " + discountLabel(sale)) +
      " · " +
      countdown(sale);
}, 1000);
$("menu").onclick = () => {
  const open = $("main-nav").classList.toggle("open");
  $("menu").setAttribute("aria-expanded", open);
};
$("main-nav").onclick = () => {
  $("main-nav").classList.remove("open");
  $("menu").setAttribute("aria-expanded", false);
};
$("theme-switch").onclick = () => {
  const dialog = openSheet(
    "Preview themes",
    '<div class="palette-grid"><button data-id="" aria-pressed="' +
      !override +
      '">Use live theme</button>' +
      get()
        .themes.map(
          (t) =>
            '<button data-id="' +
            esc(t.id) +
            '" aria-pressed="' +
            (t.id === override) +
            '">' +
            esc(t.emoji) +
            "　" +
            esc(t.name) +
            "</button>",
        )
        .join("") +
      "</div>",
  );
  dialog.querySelectorAll("[data-id]").forEach(
    (b) =>
      (b.onclick = () => {
        override = b.dataset.id;
        render();
        closeSheet();
      }),
  );
};
$("gallery-grid").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) {
    showPhoto([...b.parentNode.children].indexOf(b));
    $("lightbox").showModal();
  }
};
$("previous").onclick = () => showPhoto(photoIndex - 1);
$("next").onclick = () => showPhoto(photoIndex + 1);
$("close-light").onclick = () => $("lightbox").close();
$("lightbox").onkeydown = (e) => {
  if (e.key === "ArrowLeft") showPhoto(photoIndex - 1);
  if (e.key === "ArrowRight") showPhoto(photoIndex + 1);
};
$("package-list").onclick = (e) => {
  const link = e.target.closest("[data-pkg]");
  if (link) $("inquiry-package").value = link.dataset.pkg;
};
$("inquiry-form").onsubmit = (e) => {
  e.preventDefault();
  createLead(Object.fromEntries(new FormData(e.currentTarget)));
  e.currentTarget.reset();
  $("thanks").hidden = false;
  $("thanks").focus();
};
