import { set } from "./store.js";
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const rootURL = (path) =>
  new URL(path, new URL("../../", import.meta.url)).href;
export function logAction(text, patch = {}) {
  set((state) => ({
    ...patch,
    activity: [{ text, at: new Date().toISOString() }, ...state.activity].slice(
      0,
      100,
    ),
  }));
}
export function toast(message, actionLabel, callback) {
  const parent = document.querySelector("dialog[open]") || document.body;
  let host = parent.querySelector(":scope > .toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    parent.append(host);
  }
  const item = document.createElement("div");
  item.textContent = message;
  if (callback) {
    const button = document.createElement("button");
    button.textContent = actionLabel;
    button.onclick = () => {
      callback();
      item.remove();
    };
    item.append(button);
  }
  host.append(item);
  setTimeout(() => item.remove(), callback ? 9000 : 4000);
}
export function closeSheet() {
  document.querySelector("#studio-sheet[open]")?.close();
}
export function openSheet(title, html) {
  closeSheet();
  const dialog = document.createElement("dialog");
  dialog.id = "studio-sheet";
  dialog.className = "sheet";
  dialog.setAttribute("aria-label", title);
  dialog.innerHTML =
    '<header class="sheet-heading"><h2>' +
    esc(title) +
    '</h2><button type="button" aria-label="Close dialog">×</button></header><div class="sheet-body">' +
    html +
    "</div>";
  dialog.querySelector("button").onclick = () => dialog.close();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.addEventListener("click", (event) => {
    if (
      event.target === dialog &&
      event.clientX < dialog.getBoundingClientRect().left
    )
      dialog.close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
