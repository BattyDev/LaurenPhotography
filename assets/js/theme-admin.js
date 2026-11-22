import { get, set } from "./store.js";
import { esc, toast, logAction, openSheet, rootURL } from "./ui.js";
import { activeTheme, conflicts, dayString, nextChange } from "./themes.js";

let previewId = "";
let lastLive = "";
const dateLabel = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const themeById = (id) => get().themes.find((theme) => theme.id === id);
const updateTheme = (id, patch) =>
  set((state) => ({
    themes: state.themes.map((theme) =>
      theme.id === id ? { ...theme, ...patch } : theme,
    ),
  }));

function framePreview(id) {
  const frame = document.querySelector("#live-preview");
  if (frame)
    frame.src = rootURL(id ? "?preview=" + encodeURIComponent(id) : "./");
}

function celebrate(theme, button) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = button.getBoundingClientRect();
  const colors = [theme.palette.accent, "#bc9362", "#99ab85", "#bf8e80"];
  for (let i = 0; i < 20; i++) {
    const bit = document.createElement("i");
    bit.className = "theme-confetti";
    bit.style.left = rect.left + rect.width / 2 + "px";
    bit.style.top = rect.top + "px";
    bit.style.background = colors[i % colors.length];
    bit.style.setProperty(
      "--dx",
      Math.round((Math.random() - 0.5) * 260) + "px",
    );
    bit.style.setProperty("--dy", Math.round(-30 - Math.random() * 115) + "px");
    document.body.append(bit);
    setTimeout(() => bit.remove(), 1100);
  }
}

function card(theme, selected, liveId) {
  const id = esc(theme.id);
  const fields = [
    ["headline", "Hero headline"],
    ["subline", "Hero subline"],
    ["cta", "Call to action"],
  ];
  return `<article class="theme-card" data-selected="${theme.id === selected}">
    <button type="button" class="theme-select" data-preview="${id}" aria-label="Preview ${esc(theme.name)} theme" aria-pressed="${theme.id === selected}">
      <img alt="" src="${esc(rootURL(theme.images.hero))}" loading="lazy">
      <span class="theme-name"><span><span aria-hidden="true">${esc(theme.emoji)}</span> ${esc(theme.name)}</span>${theme.id === liveId ? '<small class="theme-live">Live</small>' : ""}</span>
      <span class="theme-swatches" aria-hidden="true">${Object.values(
        theme.palette,
      )
        .slice(0, 4)
        .map((color) => `<i style="background:${esc(color)}"></i>`)
        .join("")}</span>
    </button>
    <details><summary>Customize</summary><form data-customize="${id}">${fields.map(([key, label]) => `<label>${label}<input name="${key}" value="${esc(theme[key])}" required></label>`).join("")}
    <button type="submit">Save text</button><button type="button" data-upload="${id}">Replace photos</button></form></details>
  </article>`;
}

function photoSheet(id) {
  const theme = themeById(id);
  const slots = [
    "hero",
    ...theme.images.gallery.map((_, i) => "gallery-" + (i + 1)),
  ];
  const dialog = openSheet(
    "Replace photos",
    `<form class="theme-upload"><label>Photo slot<select name="slot">${slots.map((slot, i) => `<option value="${slot}">${i ? "Gallery " + i : "Hero image"}</option>`).join("")}</select></label>
    <p data-current></p><label>Choose a photo<input name="photo" type="file" accept="image/*"></label><img alt="Selected photo preview" hidden>
    <progress max="100" value="0" aria-label="Simulated upload progress" hidden></progress><p role="status"></p></form>`,
  );
  const form = dialog.querySelector("form");
  const img = form.querySelector("img"),
    progress = form.querySelector("progress"),
    message = form.querySelector("[role=status]");
  let url, timer;
  const clear = () => {
    clearInterval(timer);
    if (url) URL.revokeObjectURL(url);
    url = "";
    img.removeAttribute("src");
    img.hidden = true;
    progress.hidden = true;
    message.textContent = "";
  };
  function showFilename() {
    const filename = themeById(id).filenames?.[form.elements.slot.value];
    form.querySelector("[data-current]").textContent = filename
      ? "Demo filename: " + filename
      : "This slot uses a sample illustration.";
  }
  showFilename();
  form.elements.slot.onchange = () => {
    clear();
    form.elements.photo.value = "";
    showFilename();
  };
  form.elements.photo.onchange = () => {
    clear();
    const file = form.elements.photo.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.textContent = "Choose an image file for the preview.";
      return;
    }
    const slot = form.elements.slot.value;
    url = URL.createObjectURL(file);
    img.src = url;
    img.hidden = false;
    progress.hidden = false;
    progress.value = 0;
    message.textContent = "Previewing photo…";
    timer = setInterval(() => {
      progress.value = Math.min(100, progress.value + 20);
      if (progress.value < 100) return;
      clearInterval(timer);
      updateTheme(id, {
        filenames: { ...themeById(id).filenames, [slot]: file.name },
      });
      showFilename();
      message.textContent =
        "In the real version, your photo would upload here.";
    }, 140);
  };
  dialog.addEventListener("close", clear, { once: true });
}

function automatic(state) {
  const from = state.previewDate || dayString();
  const year = from.slice(0, 4);
  const current = activeTheme(state);
  const next = nextChange(state, from, current);
  const overlap = conflicts(state.themes);
  return `<div class="theme-schedule">
    <div class="theme-summary"><strong>Live now: ${esc(current.name)}${current.id === "classic" ? "" : " (until " + dateLabel(year + "-" + current.schedule.end) + ")"}</strong>
    <span>${next ? "Up next: " + esc(next.theme.name) + " on " + dateLabel(next.date) : "No other seasonal theme is scheduled."}</span></div>
    <div class="theme-date-preview"><label>Preview a date<input data-date-preview type="date" value="${esc(state.previewDate)}"></label><button data-today type="button">Use today</button></div>
    ${overlap.length ? `<p class="theme-warning" role="status">Overlapping windows: ${overlap.map((pair) => pair.map(esc).join(" / ")).join(", ")}. The later start date wins.</p>` : ""}
    <div class="theme-season-rows">${state.themes
      .filter((theme) => theme.id !== "classic")
      .map(
        (theme) => `<div class="theme-season" data-season="${esc(theme.id)}">
      <label><input type="checkbox" name="enabled" ${theme.schedule.enabled ? "checked" : ""}> ${esc(theme.name)}</label>
      ${["start", "end"].map((key) => `<label>${key === "start" ? "Starts" : "Ends"}<input type="date" aria-label="${esc(theme.name)} ${key} date" name="${key}" value="${year}-${esc(theme.schedule[key])}" required></label>`).join("")}</div>`,
      )
      .join("")}</div>
    <p>Windows repeat each year. Everyday fills the gaps.</p></div>`;
}

export function renderThemes(root) {
  const state = get();
  if (lastLive !== state.themeId) {
    previewId = "";
    lastLive = state.themeId;
  }
  const manual = state.mode !== "automatic";
  const selected =
    themeById(previewId) || themeById(state.themeId) || state.themes[0];
  root.innerHTML = `<section class="theme-editor"><div class="theme-toolbar"><div class="theme-mode" role="group" aria-label="Theme mode">${["manual", "automatic"].map((mode) => `<button type="button" data-mode="${mode}" aria-pressed="${state.mode === mode}">${mode === "manual" ? "Manual" : "Automatic"}</button>`).join("")}</div>
    ${manual ? '<button class="primary" type="button" data-publish>Make it live</button>' : ""}</div>
    ${manual ? `<div class="theme-grid">${state.themes.map((theme) => card(theme, selected.id, state.themeId)).join("")}</div>` : automatic(state)}
    <label class="theme-switcher-setting"><input type="checkbox" data-switcher ${state.settings.showSwitcher ? "checked" : ""}> Show demo switcher on site</label></section>`;
  const refresh = () => renderThemes(root);
  for (const button of root.querySelectorAll("[data-mode]"))
    button.onclick = () => {
      previewId = "";
      logAction(button.textContent + " theme mode selected", {
        mode: button.dataset.mode,
      });
      framePreview("");
      refresh();
      root.querySelector(`[data-mode="${button.dataset.mode}"]`)?.focus();
    };
  for (const button of root.querySelectorAll("[data-preview]"))
    button.onclick = () => {
      previewId = button.dataset.preview;
      for (const other of root.querySelectorAll("[data-preview]")) {
        other.setAttribute("aria-pressed", String(other === button));
        other.closest("article").dataset.selected = String(other === button);
      }
      framePreview(previewId);
    };
  const publish = root.querySelector("[data-publish]");
  if (publish)
    publish.onclick = () => {
      const theme = themeById(previewId || get().themeId);
      celebrate(theme, publish);
      logAction(theme.name + " theme is live", { themeId: theme.id });
      previewId = "";
      framePreview("");
      toast(theme.name + " theme is live");
      refresh();
      root.querySelector("[data-publish]")?.focus();
    };
  for (const form of root.querySelectorAll("[data-customize]"))
    form.onsubmit = (event) => {
      event.preventDefault();
      const theme = themeById(form.dataset.customize);
      const patch = Object.fromEntries(new FormData(form));
      updateTheme(theme.id, patch);
      toast("Saved ✓");
    };
  for (const button of root.querySelectorAll("[data-upload]"))
    button.onclick = () => photoSheet(button.dataset.upload);
  root.querySelector("[data-switcher]").onchange = (event) => {
    set((state) => ({
      settings: { ...state.settings, showSwitcher: event.target.checked },
    }));
    toast("Saved ✓");
  };
  const previewDate = root.querySelector("[data-date-preview]");
  if (previewDate) {
    previewDate.onchange = () => {
      set({ previewDate: previewDate.value });
      framePreview("");
      refresh();
      root.querySelector("[data-date-preview]").focus();
    };
    root.querySelector("[data-today]").onclick = () => {
      set({ previewDate: "" });
      framePreview("");
      refresh();
      root.querySelector("[data-today]").focus();
    };
    for (const row of root.querySelectorAll("[data-season]"))
      row.onchange = (event) => {
        const field = event.target;
        const id = row.dataset.season,
          theme = themeById(id);
        if (!field.validity.valid) {
          field.reportValidity();
          return;
        }
        const value =
          field.type === "checkbox" ? field.checked : field.value.slice(5);
        updateTheme(id, {
          schedule: { ...theme.schedule, [field.name]: value },
        });
        toast("Saved ✓");
        refresh();
        root
          .querySelector(`[data-season="${id}"] [name="${field.name}"]`)
          .focus();
      };
  }
}
