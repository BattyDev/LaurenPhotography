import { ready, get, subscribe, resetDemo } from "./store.js";
import { esc, openSheet, closeSheet, toast, rootURL } from "./ui.js";
import { renderThemes } from "./theme-admin.js";
import { renderPricing } from "./pricing-admin.js";
import { renderClients } from "./clients-admin.js";
import { startClientSimulation } from "./contracts.js";
const $ = (id) => document.getElementById(id);
const tabs = {
  theme: renderThemes,
  pricing: renderPricing,
  clients: renderClients,
};
let active = "theme",
  signedIn = false,
  known = new Set();
function render() {
  $("theme-title").hidden = active !== "theme";
  tabs[active]($("panel"));
  document.querySelectorAll("[data-tab]").forEach((b) => {
    if (b.dataset.tab === active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}
function enter() {
  signedIn = true;
  $("welcome").hidden = true;
  document.querySelector(".dashboard").hidden = false;
  document.querySelector(".user-tools").hidden = false;
  known = new Set(get().clients.map((c) => c.id));
  $("live-preview").src = rootURL("./");
  startClientSimulation();
  render();
}
function relative(at) {
  const secs = Math.max(0, (Date.now() - Date.parse(at)) / 1000);
  for (const [size, word] of [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ])
    if (secs >= size) {
      const n = Math.floor(secs / size);
      return n + " " + word + (n === 1 ? "" : "s") + " ago";
    }
  return "Just now";
}
await ready;
$("business").textContent = get().settings.businessName;
try {
  if (sessionStorage.getItem("lp-demo-session") === "open") enter();
} catch {}
$("login").onsubmit = (e) => {
  e.preventDefault();
  try {
    sessionStorage.setItem("lp-demo-session", "open");
  } catch {}
  enter();
};
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      active = b.dataset.tab;
      if (active !== "theme") $("live-preview").src = rootURL("./");
      render();
    }),
);
$("feed").onclick = () =>
  openSheet(
    "Recent activity",
    '<ul class="activity-list">' +
      get()
        .activity.map(
          (a) =>
            "<li>" +
            esc(a.text) +
            "<small>" +
            esc(relative(a.at)) +
            "</small></li>",
        )
        .join("") +
      "</ul>",
  );
$("more").onclick = () => {
  const d = openSheet(
    "Studio options",
    '<button id="reset">Reset demo</button>',
  );
  d.querySelector("#reset").onclick = () => {
    const confirm = openSheet(
      "Reset demo?",
      '<p>This restores the sample themes, packages, and clients and clears your demo changes.</p><p><button id="cancel">Keep changes</button> <button id="confirm" class="primary">Reset demo</button></p>',
    );
    confirm.querySelector("#cancel").onclick = closeSheet;
    confirm.querySelector("#confirm").onclick = () => {
      resetDemo();
      closeSheet();
      $("live-preview").src = rootURL("./");
      active = "theme";
      render();
      toast("Demo restored");
    };
  };
};
subscribe((state, external) => {
  if (!signedIn) return;
  if (external) {
    for (const client of state.clients)
      if (client.status === "Lead" && !known.has(client.id))
        toast("New inquiry from " + client.name);
    render();
  }
  known = new Set(state.clients.map((c) => c.id));
});
