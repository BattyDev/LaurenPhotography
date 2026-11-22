import { get, subscribe } from "./store.js";
import { esc, toast, openSheet, closeSheet } from "./ui.js";
import { money, quote } from "./pricing.js";
import {
  contractHTML,
  dateLabel,
  emailHTML,
  findClient,
  makeSnapshot,
  recordSend,
  saveDraft,
  sign,
  signingLink,
  statuses,
} from "./contracts.js";

let listRoot,
  selectedStatus = "All",
  searchText = "";
const e = (value) => esc(String(value ?? ""));
const chip = (status) =>
  '<span class="client-status state-' +
  status.toLowerCase() +
  '">' +
  e(status) +
  "</span>";
const packageName = (c) =>
  c.snapshot?.packageName ||
  get().packages.find((p) => p.id === c.packageId)?.name ||
  "Package to be confirmed";
const button = (id, label, primary = false) =>
  '<button type="button" class="' +
  (primary ? "client-primary" : "client-button") +
  '" data-action="' +
  id +
  '">' +
  label +
  "</button>";
const on = (root, action, handler) =>
  root
    .querySelector('[data-action="' + action + '"]')
    ?.addEventListener("click", handler);

function paintRows() {
  const list = listRoot?.querySelector("#client-rows");
  if (!list) return;
  const query = searchText.trim().toLowerCase();
  const clients = get().clients.filter(
    (c) =>
      (selectedStatus === "All" || c.status === selectedStatus) &&
      (c.name + " " + c.email + " " + packageName(c))
        .toLowerCase()
        .includes(query),
  );
  list.innerHTML =
    clients
      .map(
        (c) =>
          '<button type="button" class="client-row" data-id="' +
          e(c.id) +
          '"><span class="client-row-copy"><strong>' +
          e(c.name) +
          "</strong><span>" +
          e(packageName(c)) +
          " · " +
          dateLabel(c.date) +
          "</span></span>" +
          chip(c.status) +
          "</button>",
      )
      .join("") || '<p class="client-empty">No clients match this search.</p>';
  list
    .querySelectorAll("[data-id]")
    .forEach((row) => (row.onclick = () => detail(row.dataset.id)));
  const count = listRoot.querySelector("[data-count]");
  if (count) count.textContent = get().outbox.length;
}

export function renderClients(root) {
  listRoot = root;
  root.innerHTML =
    '<section class="clients-panel"><div class="client-head"><h2>Clients &amp; contracts</h2>' +
    button("new", "+ New client", true) +
    '</div><label class="client-search">Search clients<input type="search" placeholder="Name, email or package" value="' +
    e(searchText) +
    '"></label><div class="client-filters" aria-label="Filter clients by status">' +
    ["All", ...statuses]
      .map(
        (status) =>
          '<button type="button" data-filter="' +
          status +
          '" aria-pressed="' +
          (status === selectedStatus) +
          '">' +
          status +
          "</button>",
      )
      .join("") +
    '</div><div id="client-rows" class="client-rows"></div><div class="client-outbox"><div><h3>Demo outbox</h3><p>Nothing actually sent.</p></div>' +
    button("outbox", "View outbox (<span data-count></span>)") +
    "</div></section>";
  paintRows();
  root.querySelector("input").oninput = (event) => {
    searchText = event.target.value;
    paintRows();
  };
  root.querySelectorAll("[data-filter]").forEach(
    (filter) =>
      (filter.onclick = () => {
        selectedStatus = filter.dataset.filter;
        root
          .querySelectorAll("[data-filter]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === filter)));
        paintRows();
      }),
  );
  on(root, "new", () => editClient());
  on(root, "outbox", outbox);
}

subscribe(() => paintRows());

function outbox() {
  const mails = get().outbox;
  const sheet = openSheet(
    "Demo outbox",
    '<p>Nothing actually sent.</p><div class="client-rows">' +
      (mails
        .map(
          (mail) =>
            '<button type="button" class="client-row" data-mail="' +
            e(mail.id) +
            '"><span class="client-row-copy"><strong>' +
            e(mail.subject) +
            "</strong><span>" +
            e(mail.to) +
            " · " +
            dateLabel(mail.at, true) +
            "</span></span></button>",
        )
        .join("") ||
        '<p class="client-empty">Your sample emails will appear here after you send a contract.</p>') +
      "</div>",
  );
  sheet.querySelectorAll("[data-mail]").forEach(
    (el) =>
      (el.onclick = () => {
        const mail = mails.find((m) => m.id === el.dataset.mail);
        const preview = openSheet(
          "Demo email",
          emailHTML(mail) + button("back", "Back to outbox"),
        );
        on(preview, "back", outbox);
      }),
  );
}

function input(label, key, type, value, options = "") {
  return (
    '<label class="client-field">' +
    label +
    '<input name="' +
    key +
    '" type="' +
    type +
    '" value="' +
    e(value) +
    '" ' +
    options +
    '><small class="client-error" data-error="' +
    key +
    '" aria-live="polite"></small></label>'
  );
}

function editClient(initial = {}, existingId = null) {
  const state = get();
  const packages = state.packages;
  if (!packages.length) {
    toast("Add a package in Pricing first.");
    return;
  }
  const selected =
    packages.find((p) => p.id === initial.packageId) || packages[0];
  const snapshot = makeSnapshot(selected.id);
  const sheet = openSheet(
    existingId ? "Client details" : "New client & contract",
    '<form id="client-editor"><p class="client-step">1 of 3 · Client details</p><div class="client-fields">' +
      input(
        "Client name",
        "name",
        "text",
        initial.name,
        'required maxlength="140" autocomplete="name"',
      ) +
      input(
        "Email",
        "email",
        "email",
        initial.email,
        'required autocomplete="email"',
      ) +
      input(
        "Phone",
        "phone",
        "tel",
        initial.phone,
        'required autocomplete="tel"',
      ) +
      input(
        "Session location",
        "location",
        "text",
        initial.location,
        "required",
      ) +
      input("Session date", "date", "date", initial.date, "required") +
      input("Session time", "time", "time", initial.time, "required") +
      '<label class="client-field">Package<select name="packageId">' +
      packages
        .map(
          (p) =>
            '<option value="' +
            e(p.id) +
            '" ' +
            (p.id === selected.id ? "selected" : "") +
            ">" +
            e(p.name) +
            " · " +
            money(quote(p, state).price) +
            (p.visible === false ? " (studio only)" : "") +
            "</option>",
        )
        .join("") +
      "</select></label>" +
      input(
        "Deposit (USD)",
        "deposit",
        "number",
        initial.deposit ?? snapshot.price / 2,
        'required min="0" max="' +
          snapshot.price +
          '" step="0.01" inputmode="decimal"',
      ) +
      '<label class="client-field wide">Session notes<textarea name="notes" rows="3">' +
      e(initial.notes) +
      "</textarea></label></div>" +
      '<label class="client-check"><input type="checkbox" name="optOut" ' +
      (initial.optOut ? "checked" : "") +
      ">Client opts out of portfolio and marketing use</label>" +
      '<button type="submit" class="client-primary">Preview contract</button></form>',
  );
  const form = sheet.querySelector("#client-editor");
  const fields = form.elements;
  fields.packageId.onchange = () => {
    const price = makeSnapshot(fields.packageId.value).price;
    fields.deposit.max = price;
    fields.deposit.value = price / 2;
  };
  function validate(field) {
    let message = "";
    const value = field.value.trim();
    if (
      field.name === "email" &&
      (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    )
      message = "Enter an email like name@example.com.";
    if (
      field.name === "phone" &&
      (!/^[+\d() .-]+$/.test(value) ||
        !/^\d{7,15}$/.test(value.replace(/\D/g, "")))
    )
      message = "Enter a phone number with 7 to 15 digits.";
    if (["name", "location"].includes(field.name) && !value)
      message =
        "Please enter " +
        (field.name === "name"
          ? "the client’s name."
          : "the session location.");
    field.setCustomValidity(message);
    field.setAttribute("aria-invalid", String(!!message));
    sheet.querySelector('[data-error="' + field.name + '"]').textContent =
      message;
  }
  for (const key of ["name", "location", "phone", "email"]) {
    fields[key].onblur = fields[key].oninput = () => validate(fields[key]);
    fields[key].oninvalid = () => validate(fields[key]);
  }
  form.onsubmit = (event) => {
    event.preventDefault();
    ["name", "location", "email", "phone"].forEach((key) =>
      validate(fields[key]),
    );
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form));
    ["name", "email", "phone", "location"].forEach(
      (k) => (values[k] = values[k].trim()),
    );
    values.deposit = Number(values.deposit);
    values.optOut = fields.optOut.checked;
    const id = saveDraft(values, existingId).id;
    preview(id);
  };
}

async function preview(id) {
  const client = findClient(id);
  if (!client) return;
  const content = await contractHTML(client);
  const sheet = openSheet(
    "Preview contract",
    '<p class="client-step">2 of 3 · Review the filled agreement</p>' +
      content +
      '<div class="client-actions">' +
      button("edit", "Edit details") +
      button("send", "Continue to email", true) +
      "</div>",
  );
  on(sheet, "edit", () => editClient(client, id));
  on(sheet, "send", () => compose(id));
}

function compose(id) {
  const client = findClient(id);
  if (!client) return;
  const sheet = openSheet(
    "Email contract",
    '<form id="mail-form"><p class="client-step">3 of 3 · Demo email</p>' +
      input("To", "to", "email", client.email, "required") +
      input(
        "Subject",
        "subject",
        "text",
        "Your photography session agreement",
        "required",
      ) +
      '<label class="client-field">Message<textarea name="message" rows="6" required>' +
      e(
        "Hi " +
          client.name +
          ",\n\nHere’s the agreement for your " +
          packageName(client) +
          " session. Please review it and sign when you’re ready.\n\nThank you,\n" +
          get().settings.businessName,
      ) +
      '</textarea></label><p>The signing link is included in this demo email.</p><button class="client-primary">Email contract</button><p role="status" id="mail-status"></p></form>',
  );
  const form = sheet.querySelector("form");
  form.onsubmit = async (event) => {
    event.preventDefault();
    const submit = form.querySelector("button");
    if (submit.disabled) return;
    const mail = Object.fromEntries(new FormData(form));
    submit.disabled = true;
    submit.textContent = "Sending…";
    await new Promise((done) => setTimeout(done, 1500));
    if (!recordSend(id, mail)) {
      if (form.isConnected)
        form.querySelector("#mail-status").textContent =
          "This contract is no longer available to send.";
      return;
    }
    toast("✓ Sent to " + mail.to);
    if (sheet.open && form.isConnected) detail(id);
  };
}

async function detail(id) {
  const c = findClient(id);
  if (!c) return;
  const draft = c.status === "Draft",
    lead = c.status === "Lead",
    signed = c.status === "Signed";
  const agreement = lead ? "" : await contractHTML(c);
  const sheet = openSheet(
    c.name,
    '<div data-client-detail="' +
      e(id) +
      '">' +
      chip(c.status) +
      "<h3>" +
      e(packageName(c)) +
      "</h3><p>" +
      dateLabel(c.date) +
      (c.time ? " · " + e(c.time) : "") +
      "</p>" +
      '<dl class="client-facts"><dt>Email</dt><dd>' +
      e(c.email) +
      "</dd><dt>Phone</dt><dd>" +
      e(c.phone || "To be confirmed") +
      "</dd><dt>Location</dt><dd>" +
      e(c.location || "To be confirmed") +
      "</dd>" +
      (c.notes ? "<dt>Notes</dt><dd>" + e(c.notes) + "</dd>" : "") +
      '</dl><div class="client-actions">' +
      (lead || draft
        ? button("edit", lead ? "Create contract" : "Edit details", true)
        : "") +
      (draft ? button("preview", "Preview contract") : "") +
      (!lead && !signed
        ? button("send", draft ? "Email contract" : "Resend contract")
        : "") +
      (!lead ? button("copy", "Copy signing link") : "") +
      (["Sent", "Viewed"].includes(c.status)
        ? button("sign", "Simulate client signing")
        : "") +
      button("duplicate", "Duplicate for new session") +
      (!lead
        ? button("print", "Download PDF") + button("deposit", "Request deposit")
        : "") +
      "</div>" +
      '<h3>Timeline</h3><ol class="client-timeline">' +
      (c.timeline || [])
        .map(
          (step) =>
            "<li><b>" +
            e(step.label) +
            "</b><time>" +
            dateLabel(step.at, true) +
            "</time></li>",
        )
        .join("") +
      "</ol>" +
      (agreement
        ? '<details class="detail-contract"><summary>Sample agreement</summary>' +
          agreement +
          "</details>"
        : "") +
      "</div>",
  );
  on(sheet, "edit", () => editClient(c, id));
  on(sheet, "preview", () => preview(id));
  on(sheet, "send", () => compose(id));
  on(sheet, "sign", () => {
    sign(id, c.name, "Simulated by studio");
    toast("Sample contract signed");
  });
  on(sheet, "duplicate", () =>
    editClient({ ...c, date: "", time: "", deposit: null }),
  );
  on(sheet, "deposit", () =>
    toast("Sample payment link · example.com/deposit/" + id),
  );
  on(sheet, "print", () => {
    sheet.querySelector("details").open = true;
    window.print();
  });
  on(sheet, "copy", async () => {
    try {
      await navigator.clipboard.writeText(signingLink(id));
      toast("Signing link copied");
    } catch {
      const linkSheet = openSheet(
        "Copy signing link",
        '<label class="client-field">Signing link<input readonly value="' +
          e(signingLink(id)) +
          '"></label>',
      );
      linkSheet.querySelector("input").select();
    }
  });
}

subscribe(() => {
  const node = document.querySelector("dialog[open] [data-client-detail]");
  if (!node) return;
  const current = findClient(node.dataset.clientDetail);
  if (!current) closeSheet();
  else if (node.querySelector(".client-status").textContent !== current.status)
    detail(current.id);
});
