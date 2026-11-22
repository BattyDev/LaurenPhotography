const key = "lp-demo-state-v1";
let defaults,
  state,
  memoryOnly = false;
const listeners = new Set();
function storageNotice() {
  memoryOnly = true;
  if (document.querySelector(".storage-notice")) return;
  const note = document.createElement("aside");
  note.className = "storage-notice";
  note.textContent = "Demo changes won't be saved in this browser";
  document.body.append(note);
}
function read() {
  if (memoryOnly) return state;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      ...structuredClone(defaults),
      ...saved,
      // Photo files ship with the site. Keep local theme edits when those files change.
      themes: defaults.themes.map((theme) => ({
        ...theme,
        ...saved?.themes?.find((entry) => entry.id === theme.id),
        images: theme.images,
      })),
      settings: { ...defaults.settings, ...saved?.settings },
    };
  } catch {
    storageNotice();
    return state || structuredClone(defaults);
  }
}
export const ready = fetch(new URL("../../data/defaults.json", import.meta.url))
  .then((response) => {
    if (!response.ok) throw new Error("Could not load studio settings");
    return response.json();
  })
  .then((seed) => {
    defaults = seed;
    state = read();
    return state;
  });
export const get = () => state;
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(external) {
  for (const fn of listeners) fn(state, external);
}
export function set(patch) {
  const latest = read();
  state = {
    ...latest,
    ...(typeof patch === "function" ? patch(latest) : patch),
  };
  if (!memoryOnly) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      storageNotice();
    }
  }
  notify(false);
}
export function resetDemo() {
  state = structuredClone(defaults);
  try {
    localStorage.removeItem(key);
  } catch {
    storageNotice();
  }
  notify(false);
}
window.addEventListener("storage", (event) => {
  if (defaults && (event.key === key || event.key === null)) {
    state = read();
    notify(true);
  }
});
