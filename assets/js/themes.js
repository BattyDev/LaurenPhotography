export function dayString(date = new Date()) {
  const pad = (number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function matches(day, { start, end, enabled }) {
  if (!enabled || !start || !end) return false;
  return start <= end ? day >= start && day <= end : day >= start || day <= end;
}

export function scheduledTheme(state, input) {
  const iso = typeof input === "string" ? input : dayString(input);
  const day = iso.slice(5);
  const year = Number(iso.slice(0, 4));
  let winner = state.themes.find((theme) => theme.id === "classic");
  let latest = "";
  for (const theme of state.themes) {
    if (!matches(day, theme.schedule)) continue;
    const start =
      (theme.schedule.start > day ? year - 1 : year) +
      "-" +
      theme.schedule.start;
    if (start > latest) {
      winner = theme;
      latest = start;
    }
  }
  return winner;
}

export function activeTheme(state, date) {
  return state.mode === "automatic"
    ? scheduledTheme(state, date || state.previewDate || new Date())
    : state.themes.find((theme) => theme.id === state.themeId) ||
        state.themes[0];
}

export function applyTheme(theme, element = document.documentElement) {
  element.dataset.theme = theme.id;
  element.dataset.overlay = theme.overlay || "";
  for (const [key, value] of Object.entries(theme.palette)) {
    const property = key === "accentText" ? "accent-text" : key;
    element.style.setProperty("--" + property, value);
  }
  element.style.setProperty("--heading-font", theme.headingFont);
  element.style.setProperty("--accentText", theme.palette.accentText);
}

export function conflicts(themes) {
  const pairs = [];
  for (const [index, a] of themes.entries()) {
    if (!a.schedule.enabled) continue;
    for (const b of themes.slice(index + 1)) {
      if (!b.schedule.enabled) continue;
      if (
        matches(a.schedule.start, b.schedule) ||
        matches(b.schedule.start, a.schedule)
      )
        pairs.push([a.name, b.name]);
    }
  }
  return pairs;
}

export function nextChange(state, from, current) {
  const date = new Date(from + "T12:00:00");
  for (let i = 0; i < 370; i++) {
    date.setDate(date.getDate() + 1);
    const selected = scheduledTheme(state, date);
    if (selected.id !== current.id && selected.id !== "classic")
      return { theme: selected, date: dayString(date) };
  }
  return null;
}
