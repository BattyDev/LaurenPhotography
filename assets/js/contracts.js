import { get, subscribe } from "./store.js";
import { esc, logAction, rootURL, toast } from "./ui.js";
import { money, quote } from "./pricing.js";

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
export const statuses = ["Lead", "Draft", "Sent", "Viewed", "Signed"];
export const findClient = (id) =>
  get().clients.find((client) => client.id === id);
export const signingLink = (id) => {
  const url = new URL(rootURL("contract.html"));
  url.searchParams.set("id", id);
  return url.href;
};

export function dateLabel(value, withTime = false) {
  if (!value) return "To be confirmed";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  if (Number.isNaN(date.getTime())) return "To be confirmed";
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  });
}

export function makeSnapshot(packageId) {
  const state = get();
  const pkg = state.packages.find((item) => item.id === packageId);
  if (!pkg) return null;
  const { price, note } = quote(pkg, state);
  return {
    packageName: pkg.name,
    includes: pkg.includes.join(", "),
    price,
    saleNote: note,
    business: state.settings.businessName,
    delivery: state.settings.deliveryDays,
  };
}

export function createLead({ name, email, phone, date, packageId }) {
  const at = now();
  const client = {
    id: uid(),
    name,
    email,
    phone,
    date,
    packageId,
    time: "",
    location: "",
    notes: "",
    deposit: null,
    status: "Lead",
    timeline: [{ label: "Created", at }],
  };
  logAction("New inquiry from " + name, {
    clients: [client, ...get().clients],
  });
  return client;
}

export function saveDraft(fields, existingId) {
  const previous = existingId && findClient(existingId);
  const at = now();
  const client = {
    ...fields,
    id: previous?.id || uid(),
    status: "Draft",
    snapshot: makeSnapshot(fields.packageId),
    contractDate: at,
    timeline: previous?.timeline || [{ label: "Created", at }],
  };
  const clients = previous
    ? get().clients.map((item) => (item.id === client.id ? client : item))
    : [client, ...get().clients];
  logAction("Saved contract draft for " + client.name, { clients });
  return client;
}

export function recordSend(id, { to, subject, message }) {
  const client = findClient(id);
  if (!client || client.status === "Signed") return false;
  const at = now();
  const status = client.status === "Viewed" ? "Viewed" : "Sent";
  const entry = {
    id: uid(),
    clientId: id,
    to,
    subject,
    message,
    at,
    business: get().settings.businessName,
  };
  const updated = {
    ...client,
    status,
    viewAfter: status === "Sent" ? Date.now() + 8000 : null,
    snapshot: client.snapshot || makeSnapshot(client.packageId),
    contractDate: client.contractDate || at,
    timeline: [...client.timeline, { label: "Sent", at }],
  };
  logAction("Sent sample contract to " + to, {
    clients: get().clients.map((c) => (c.id === id ? updated : c)),
    outbox: [entry, ...get().outbox],
  });
  return true;
}

export function markViewed(id) {
  const client = findClient(id);
  if (!client || client.status !== "Sent") return;
  const updated = {
    ...client,
    status: "Viewed",
    viewAfter: null,
    timeline: [...client.timeline, { label: "Viewed", at: now() }],
  };
  logAction(client.name + " opened your contract", {
    clients: get().clients.map((c) => (c.id === id ? updated : c)),
  });
}

let simulationStarted = false;
export function startClientSimulation() {
  if (simulationStarted) return;
  simulationStarted = true;
  let timer;
  function schedule() {
    clearTimeout(timer);
    const pending = get()
      .clients.filter((c) => c.status === "Sent" && c.viewAfter)
      .sort((a, b) => a.viewAfter - b.viewAfter);
    if (!pending.length) return;
    const next = pending[0];
    timer = setTimeout(
      () => {
        if (findClient(next.id)?.status === "Sent") {
          markViewed(next.id);
          toast(next.name + " opened your contract");
        }
        schedule();
      },
      Math.max(0, next.viewAfter - Date.now()),
    );
  }
  subscribe(schedule);
  schedule();
}

export function sign(id, name, browser, drawing = "") {
  const client = findClient(id);
  if (!client || client.status === "Signed") return client;
  const at = now();
  const timeline = [...client.timeline];
  if (client.status === "Sent") timeline.push({ label: "Viewed", at });
  timeline.push({ label: "Signed", at });
  const updated = {
    ...client,
    snapshot: client.snapshot || makeSnapshot(client.packageId),
    contractDate: client.contractDate || at,
    status: "Signed",
    viewAfter: null,
    signedRecord: { name, at, browser, drawing },
    timeline,
  };
  logAction("Signed contract for " + client.name, {
    clients: get().clients.map((c) => (c.id === id ? updated : c)),
  });
  return updated;
}

let templateRequest;
export async function contractHTML(client) {
  templateRequest ||= fetch(
    new URL("../../data/contract-template.md", import.meta.url),
  )
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the sample agreement.");
      return response.text();
    })
    .catch((error) => {
      templateRequest = null;
      throw error;
    });
  const template = await templateRequest;
  const snap = client.snapshot || makeSnapshot(client.packageId) || {};
  const price = snap.price || 0;
  const deposit = client.deposit ?? price / 2;
  const fields = {
    business_name: snap.business || get().settings.businessName,
    client_name: client.name,
    client_email: client.email,
    client_phone: client.phone || "To be confirmed",
    today: dateLabel(client.contractDate || client.timeline?.[0]?.at || now()),
    package_name: snap.packageName || "Package to be confirmed",
    package_includes: snap.includes || "—",
    session_date: dateLabel(client.date),
    session_time: client.time || "To be confirmed",
    session_location: client.location || "To be confirmed",
    total_price: money(price),
    sale_note: snap.saleNote || "",
    deposit_amount: money(deposit),
    balance_due: money(price - deposit),
    delivery_days: snap.delivery || get().settings.deliveryDays,
    marketing_opt_out: client.optOut ? "Yes" : "No",
    client_signature: client.signedRecord?.name || "Awaiting client signature",
    signed_date: client.signedRecord
      ? dateLabel(client.signedRecord.at)
      : "Completed when signed",
  };
  const body = template
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => {
          const level = line.startsWith("## ")
            ? "h3"
            : line.startsWith("# ")
              ? "h2"
              : "";
          const content = esc(line.replace(/^#{1,2} /, ""))
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\{\{(\w+)\}\}/g, (_, key) =>
              fields[key] === ""
                ? ""
                : "<mark>" + esc(String(fields[key] ?? "")) + "</mark>",
            );
          return level
            ? "<" + level + ">" + content + "</" + level + ">"
            : '<span class="agreement-line">' + content + "</span>";
        })
        .join(""),
    )
    .map((block) => '<div class="agreement-block">' + block + "</div>")
    .join("");
  return (
    '<article class="agreement"><p class="agreement-warning">SAMPLE CONTRACT FOR DEMONSTRATION ONLY — NOT LEGAL ADVICE.</p>' +
    body +
    "</article>"
  );
}

export function emailHTML(mail) {
  return (
    '<article class="sample-email"><p class="mail-from">' +
    esc(mail.business) +
    "</p><h3>" +
    esc(mail.subject) +
    "</h3><p>To " +
    esc(mail.to) +
    '</p><p class="mail-body">' +
    esc(mail.message) +
    '</p><a class="client-primary" href="' +
    esc(signingLink(mail.clientId)) +
    '" target="_blank" rel="noopener">Review and sign contract</a></article>'
  );
}
