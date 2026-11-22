const key = "lp-demo-state-v2";
let defaults,
  state,
  memoryOnly = false;
const listeners = new Set();
function fillSampleDetails(client) {
  const sample = defaults.clients.find((entry) => entry.id === client.id);
  if (!sample) return client;
  const result = { ...client };
  for (const [field, placeholder] of [
    ["location", "[Sample garden location]"],
    ["notes", "[Sample session notes]"],
  ]) {
    if (result[field] === placeholder) result[field] = sample[field];
  }
  if (
    [
      "[Lauren's Studio Name] Photography",
      "Lauren’s Studio Photography",
    ].includes(result.snapshot?.business)
  ) {
    result.snapshot = {
      ...result.snapshot,
      business: defaults.settings.businessName,
    };
  }
  return result;
}
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
      clients: (saved.clients || defaults.clients).map(fillSampleDetails),
      // Photo files ship with the site. Keep local theme edits when those files change.
      themes: defaults.themes.map((theme) => ({
        ...theme,
        ...saved?.themes?.find((entry) => entry.id === theme.id),
        images: theme.images,
      })),
      settings: {
        ...defaults.settings,
        ...saved?.settings,
        businessName: [
          "[Lauren's Studio Name] Photography",
          "Lauren’s Studio Photography",
        ].includes(saved.settings?.businessName)
          ? defaults.settings.businessName
          : saved.settings?.businessName || defaults.settings.businessName,
      },
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
