import { get, set } from "./store.js";
import { esc, toast, openSheet, closeSheet, logAction } from "./ui.js";
import {
  activeSale,
  countdown,
  dateKey,
  discountLabel,
  money,
} from "./pricing.js";

const dateLabel = (day) =>
  new Date(day + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const byId = (id) => get().packages.find((pkg) => pkg.id === id);
let clock;

function futureDay(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function priceRow(pkg, index, length) {
  const title = esc(pkg.name);
  return `<article class="price-row" data-id="${esc(pkg.id)}">
    <span class="price-grip" draggable="true" title="Drag to reorder" aria-hidden="true">⠿</span>
    <button type="button" class="price-info" data-edit><span class="price-sr">Edit </span>
      <strong>${title}</strong>
      <small>${esc(pkg.includes?.join(" · ") || pkg.description || "Edit package details")}</small>
      ${pkg.featured ? '<span class="price-tag">Featured</span>' : ""}
      ${pkg.visible === false ? '<span class="price-tag">Hidden</span>' : ""}
    </button>
    <div class="price-quick"><label><span class="price-sr">Sample price for ${title}</span><span aria-hidden="true">$</span>
      <input type="number" inputmode="decimal" min="0" step="0.01" value="${Number(pkg.price)}" data-price></label>
      <small data-saved role="status">${pkg.unit ? "per " + esc(pkg.unit) : ""}</small>
    </div>
    <div class="price-order"><button type="button" data-move="-1" aria-label="Move ${title} up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-move="1" aria-label="Move ${title} down" ${index === length - 1 ? "disabled" : ""}>↓</button></div>
  </article>`;
}

function saleSection(state) {
  const sale = state.sale;
  const active = activeSale(state);
  const pending = sale && sale.start > dateKey();
  if (!active && !pending)
    return `<section class="price-card offer-card"><div>
    <h3>Seasonal sale</h3><p>Set a discount for all sessions or just a few.</p></div>
    <button class="price-primary" data-sale>Start a sale</button></section>`;
  const selection = sale.packageIds
    ? `${sale.packageIds.length} selected package${sale.packageIds.length === 1 ? "" : "s"}`
    : "All packages";
  return `<section class="price-card sale-live"><div class="price-tag">${active ? "Active sale" : "Scheduled sale"}</div>
    <h3>${esc(sale.name)}</h3><p>${esc(discountLabel(sale))} · ${selection}</p>
    <p>${esc(dateLabel(sale.start))} – ${esc(dateLabel(sale.end))}</p>
    ${active ? '<p class="sale-clock">Time remaining <strong data-countdown></strong></p>' : ""}
    <div class="price-actions"><button data-sale>Edit sale</button><button data-end>${active ? "End sale now" : "Cancel scheduled sale"}</button></div></section>`;
}

export function renderPricing(container) {
  clearInterval(clock);
  const state = get();
  container.innerHTML = `<div class="pricing-admin">
    <header class="price-head"><h2>Pricing</h2><p>Manage your session packages and seasonal offers.</p></header>
    ${saleSection(state)}
    <section class="price-card package-card"><div class="price-heading"><div><h3>Session packages</h3><p>Sample — replace with your real price.</p></div>
    <button type="button" data-add>+ Add package</button></div>
    <div class="price-rows">${state.packages.map((pkg, i) => priceRow(pkg, i, state.packages.length)).join("") || "<p>No packages yet. Add your first session above.</p>"}</div></section></div>`;
  const root = container.querySelector(".pricing-admin");
  const render = () => renderPricing(container);
  const today = dateKey();
  const updateClock = () => {
    if (!root.isConnected) {
      clearInterval(clock);
      return;
    }
    if (dateKey() !== today) {
      render();
      return;
    }
    const timer = root.querySelector("[data-countdown]");
    if (timer && get().sale) timer.textContent = countdown(get().sale);
  };
  updateClock();
  clock = setInterval(updateClock, 1000);
  root.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const row = btn.closest("[data-id]");
    if (btn.hasAttribute("data-add")) return editPackage(null, render);
    if (btn.hasAttribute("data-edit"))
      return editPackage(byId(row.dataset.id), render);
    if (btn.hasAttribute("data-sale"))
      return saleWizard(
        render,
        state.sale?.end >= dateKey() ? get().sale : null,
      );
    if (
      btn.hasAttribute("data-end") &&
      confirm("Remove this sale and restore regular prices?")
    ) {
      logAction("Ended the sale", { sale: null });
      toast("Regular prices restored");
      render();
    }
    if (btn.dataset.move) {
      const packages = get().packages;
      const index = packages.findIndex((p) => p.id === row.dataset.id);
      const target = packages[index + Number(btn.dataset.move)];
      if (target) {
        reorder(row.dataset.id, target.id, render);
        const moved = [...container.querySelectorAll("[data-id]")].find(
          (item) => item.dataset.id === row.dataset.id,
        );
        (
          moved?.querySelector(
            '[data-move="' + btn.dataset.move + '"]:not([disabled])',
          ) || moved?.querySelector("[data-edit]")
        )?.focus();
      }
    }
  });
  root.addEventListener("input", (event) => {
    const input = event.target.closest("[data-price]");
    if (!input) return;
    const row = input.closest("[data-id]");
    const saved = row.querySelector("[data-saved]");
    if (
      input.value === "" ||
      !input.validity.valid ||
      !Number.isFinite(input.valueAsNumber)
    ) {
      saved.textContent = "Enter a valid price";
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    const id = row.dataset.id;
    set({
      packages: get().packages.map((p) =>
        p.id === id ? { ...p, price: input.valueAsNumber } : p,
      ),
    });
    saved.textContent = "Saved ✓";
  });
  root.addEventListener("change", (event) => {
    if (
      !event.target.matches("[data-price]") ||
      !event.target.validity.valid ||
      event.target.value === ""
    )
      return;
    const pkg = byId(event.target.closest("[data-id]").dataset.id);
    if (pkg) logAction("Updated " + pkg.name + " to " + money(pkg.price));
  });
  let dragging = "";
  root.addEventListener("dragstart", (event) => {
    if (!event.target.closest(".price-grip")) return;
    dragging = event.target.closest("[data-id]").dataset.id;
    event.dataTransfer.setData("text/plain", dragging);
    event.dataTransfer.effectAllowed = "move";
  });
  root.addEventListener("dragover", (event) => {
    if (dragging && event.target.closest(".price-row")) event.preventDefault();
  });
  root.addEventListener("drop", (event) => {
    const row = event.target.closest(".price-row");
    if (!dragging || !row) return;
    event.preventDefault();
    reorder(dragging, row.dataset.id, render);
    dragging = "";
  });
  root.addEventListener("dragend", () => {
    dragging = "";
  });
}

function reorder(from, to, render) {
  const packages = [...get().packages];
  const i = packages.findIndex((p) => p.id === from);
  const j = packages.findIndex((p) => p.id === to);
  if (i < 0 || j < 0 || i === j) return;
  const [pkg] = packages.splice(i, 1);
  packages.splice(j, 0, pkg);
  logAction("Reordered session packages", { packages });
  render();
}

function editPackage(existing, render) {
  if (existing === undefined) return;
  const pkg = existing || {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    description: "",
    includes: [],
    visible: true,
    featured: false,
  };
  const sheet = openSheet(
    existing ? "Edit package" : "Add package",
    `<form class="price-form">
    <label>Package name<input required name="name" maxlength="100" value="${esc(pkg.name)}"></label>
    <label>Price in USD${pkg.unit ? " per " + esc(pkg.unit) : ""}<input required name="price" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(String(pkg.price))}"></label>
    <label>Description<textarea name="description" rows="2">${esc(pkg.description || "")}</textarea></label>
    <label>Included items <small>One item per line</small><textarea name="includes" rows="3">${esc((pkg.includes || []).join("\n"))}</textarea></label>
    <label class="price-check"><input type="checkbox" name="visible" ${pkg.visible !== false ? "checked" : ""}> Show on website</label>
    <label class="price-check"><input type="checkbox" name="featured" ${pkg.featured ? "checked" : ""}> Featured package</label>
    <div class="price-actions"><button class="price-primary">Save package</button>${existing ? '<button type="button" class="price-delete" data-delete>Delete package</button>' : ""}</div></form>`,
  );
  const form = sheet.querySelector(".price-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = new FormData(form);
    const name = fields.get("name").trim();
    if (!name) {
      form.elements
        .namedItem("name")
        .setCustomValidity("Enter a package name.");
      form.reportValidity();
      return;
    }
    const entry = {
      ...pkg,
      name,
      price: Number(fields.get("price")),
      description: fields.get("description").trim(),
      includes: fields
        .get("includes")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      visible: fields.has("visible"),
      featured: fields.has("featured"),
    };
    const packages = existing
      ? get().packages.map((p) => (p.id === pkg.id ? entry : p))
      : [...get().packages, entry];
    logAction((existing ? "Updated " : "Added ") + name, { packages });
    closeSheet();
    render();
    toast("Package saved ✓");
  });
  form.elements
    .namedItem("name")
    .addEventListener("input", (e) => e.target.setCustomValidity(""));
  form.querySelector("[data-delete]")?.addEventListener("click", () => {
    if (!confirm("Delete " + pkg.name + " from your packages?")) return;
    const state = get();
    const index = state.packages.findIndex((p) => p.id === pkg.id);
    const packages = state.packages.filter((p) => p.id !== pkg.id);
    logAction("Deleted " + pkg.name, { packages });
    closeSheet();
    render();
    toast("Package deleted", "Undo", () => {
      const restored = [...get().packages];
      if (restored.some((p) => p.id === pkg.id)) return;
      restored.splice(index, 0, pkg);
      logAction("Restored " + pkg.name, { packages: restored });
      if (document.querySelector(".pricing-admin")) render();
      toast("Package restored");
    });
  });
}

function saleWizard(render, existing) {
  let step = 1;
  const draft = existing
    ? structuredClone(existing)
    : {
        id: crypto.randomUUID(),
        name: "Session special",
        banner: "",
        type: "percent",
        value: 20,
        packageIds: null,
        start: dateKey(),
        end: futureDay(6),
        countdown: true,
      };
  let startsNow = draft.start === dateKey();
  const sheet = openSheet(existing ? "Edit sale" : "Start a sale", "");
  const body = sheet.querySelector(".sheet-body");
  const suggestedBanner = () =>
    `${draft.name || "Session special"} — ${discountLabel(draft)} through ${new Date(draft.end + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}!`;
  function scopeFields() {
    return `<fieldset><legend>What's on sale?</legend>
      <label class="sale-choice"><input name="scope" type="radio" value="all" ${!draft.packageIds ? "checked" : ""}> All packages</label>
      <label class="sale-choice"><input name="scope" type="radio" value="some" ${draft.packageIds ? "checked" : ""}> Pick specific packages</label>
      <div class="sale-selected" ${draft.packageIds ? "" : "hidden"}>${
        get()
          .packages.map(
            (p) =>
              `<label class="price-check"><input type="checkbox" name="selected" value="${esc(p.id)}" ${draft.packageIds?.includes(p.id) ? "checked" : ""}> ${esc(p.name)} · ${money(p.price)}</label>`,
          )
          .join("") || "<p>Add a package first to select it here.</p>"
      }</div></fieldset>`;
  }

  function amountFields() {
    return `<fieldset><legend>How much?</legend><div class="sale-picks" aria-label="Discount type">
      <button type="button" data-type="percent" aria-pressed="${draft.type === "percent"}">% off</button>
      <button type="button" data-type="amount" aria-pressed="${draft.type === "amount"}">$ off</button></div>
      <label for="sale-value">${draft.type === "percent" ? "Percentage off" : "Dollars off"}</label>
      <div class="sale-stepper"><button type="button" data-step="-1" aria-label="Decrease discount">−</button>
      <input id="sale-value" required type="number" name="value" inputmode="numeric" min="1" ${draft.type === "percent" ? 'max="100"' : ""} step="1" value="${Number(draft.value)}">
      <button type="button" data-step="1" aria-label="Increase discount">+</button></div>
      <div class="sale-picks" aria-label="Quick discounts">${[10, 15, 20, 25]
        .map(
          (v) =>
            `<button type="button" data-pick="${v}">${v === 25 ? "$25 off" : v + "%"}</button>`,
        )
        .join("")}</div></fieldset>`;
  }

  function dateFields() {
    return `<fieldset><legend>When?</legend><label class="price-check"><input name="now" type="checkbox" ${startsNow ? "checked" : ""}> Starts now</label>
      <label data-start-label ${startsNow ? "hidden" : ""}>Start date<input name="start" type="date" required value="${esc(draft.start)}" ${startsNow ? "disabled" : ""}></label>
      <label>End date<input name="end" required type="date" min="${esc(draft.start)}" value="${esc(draft.end)}"></label>
      <div class="sale-picks" aria-label="Quick end dates"><button type="button" data-until="weekend">This weekend</button>
      <button type="button" data-until="week">1 week</button><button type="button" data-until="christmas">Until Christmas</button></div></fieldset>
      <label>Sale name<input name="name" required maxlength="100" value="${esc(draft.name)}"></label>
      <label>Banner text <small>Optional</small><textarea name="banner" rows="2" maxlength="250">${esc(draft.banner || (existing ? "" : suggestedBanner()))}</textarea></label>
      <label class="price-check"><input name="countdown" type="checkbox" ${draft.countdown ? "checked" : ""}> Show a countdown on the website</label>`;
  }

  function draw() {
    body.innerHTML = `<form class="price-form sale-form"><p class="sale-progress">Step ${step} of 3</p>
      ${step === 1 ? scopeFields() : step === 2 ? amountFields() : dateFields()}
      <p class="price-error" role="alert"></p><div class="price-actions">
      ${step > 1 ? '<button type="button" data-back>Back</button>' : ""}
      <button class="price-primary">${step < 3 ? "Continue" : existing ? "Save sale" : "Start sale"}</button></div></form>`;
    if (step > 1) body.querySelector("legend")?.setAttribute("tabindex", "-1");
    body.querySelector("legend")?.focus();
  }
  const currentForm = () => body.querySelector("form");
  function updateBanner() {
    const form = currentForm();
    const useSuggested = form.elements.banner.value === suggestedBanner();
    draft.end = form.elements.end.value;
    draft.name = form.elements.namedItem("name").value.trim();
    if (useSuggested && draft.end)
      form.elements.banner.value = suggestedBanner();
  }
  function remember() {
    const data = new FormData(currentForm());
    if (step === 1)
      draft.packageIds =
        data.get("scope") === "all" ? null : data.getAll("selected");
    if (step === 2) draft.value = Number(data.get("value"));
    if (step === 3) {
      startsNow = data.has("now");
      Object.assign(draft, {
        start: startsNow ? dateKey() : data.get("start"),
        end: data.get("end"),
        name: data.get("name").trim(),
        banner: data.get("banner").trim(),
        countdown: data.has("countdown"),
      });
    }
  }
  body.addEventListener("change", (e) => {
    const form = currentForm();
    if (e.target.name === "end" || e.target.name === "name") updateBanner();
    if (e.target.name === "scope")
      form.querySelector(".sale-selected").hidden = e.target.value !== "some";
    if (e.target.name === "now" || e.target.name === "start") {
      const now = form.elements.now.checked;
      form.elements.start.disabled = now;
      form.querySelector("[data-start-label]").hidden = now;
      form.elements.end.min = now ? dateKey() : form.elements.start.value;
    }
  });
  body.addEventListener("click", (e) => {
    const button = e.target.closest('button[type="button"]');
    if (!button) return;
    const form = currentForm();
    if (button.hasAttribute("data-back")) {
      remember();
      step--;
      draw();
    }
    if (button.dataset.type || button.dataset.pick) {
      draft.type =
        button.dataset.type ||
        (button.dataset.pick === "25" ? "amount" : "percent");
      draft.value = Math.max(
        1,
        Number(button.dataset.pick || form.elements.value.value) || 1,
      );
      if (draft.type === "percent") draft.value = Math.min(100, draft.value);
      draw();
      body
        .querySelector(
          button.dataset.pick
            ? '[data-pick="' + button.dataset.pick + '"]'
            : '[data-type="' + draft.type + '"]',
        )
        .focus();
    }
    if (button.dataset.step) {
      const field = form.elements.value;
      const maximum = draft.type === "percent" ? 100 : Number.MAX_SAFE_INTEGER;
      field.value = Math.min(
        maximum,
        Math.max(1, (Number(field.value) || 0) + Number(button.dataset.step)),
      );
    }
    if (button.dataset.until) {
      const startDay = form.elements.now.checked
        ? dateKey()
        : form.elements.start.value || dateKey();
      const day = new Date(startDay + "T12:00:00");
      if (button.dataset.until === "christmas") {
        const year =
          day.getFullYear() +
          (day.getMonth() === 11 && day.getDate() > 25 ? 1 : 0);
        form.elements.end.value = dateKey(new Date(year, 11, 25));
      } else {
        day.setDate(
          day.getDate() +
            (button.dataset.until === "week" ? 6 : (7 - day.getDay()) % 7),
        );
        form.elements.end.value = dateKey(day);
      }
      updateBanner();
    }
  });
  body.addEventListener("submit", (e) => {
    e.preventDefault();
    remember();
    const error = body.querySelector('[role="alert"]');
    if (step === 1 && draft.packageIds && !draft.packageIds.length) {
      error.textContent = "Choose at least one package for this sale.";
      return;
    }
    if (step < 3) {
      step++;
      draw();
      return;
    }
    if (!draft.name) {
      error.textContent = "Give your sale a name.";
      return;
    }
    if (draft.end < draft.start || draft.end < dateKey()) {
      error.textContent =
        "Choose an end date on or after today and the start date.";
      return;
    }
    const action = existing
      ? "Updated"
      : draft.start > dateKey()
        ? "Scheduled"
        : "Started";
    logAction(action + " " + draft.name + " sale", { sale: draft });
    closeSheet();
    render();
    toast(action + " " + draft.name + " sale ✓");
  });
  draw();
}
