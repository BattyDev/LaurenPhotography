import { get, ready, subscribe } from "./store.js";
import { esc } from "./ui.js";
import {
  contractHTML,
  dateLabel,
  findClient,
  markViewed,
  sign,
} from "./contracts.js";

const room = document.querySelector("#signing-room");
const requested = new URLSearchParams(location.search).get("id");
let activeId,
  displayedStatus,
  sequence = 0;

function browserName() {
  const ua = navigator.userAgent;
  if (/Edg(?:e|A|iOS)?\//.test(ua)) return "Microsoft Edge";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "Web browser";
}

function enableDrawing(canvas) {
  const ctx = canvas.getContext("2d");
  let pointer = null,
    drawn = false;
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#253d32";
  ctx.fillStyle = "#253d32";
  ctx.lineCap = ctx.lineJoin = "round";
  function point(event) {
    const box = canvas.getBoundingClientRect();
    return [
      ((event.clientX - box.left) * canvas.width) / box.width,
      ((event.clientY - box.top) * canvas.height) / box.height,
    ];
  }
  canvas.onpointerdown = (event) => {
    if (pointer !== null) return;
    pointer = event.pointerId;
    canvas.setPointerCapture(pointer);
    const [x, y] = point(event);
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawn = true;
  };
  canvas.onpointermove = (event) => {
    if (event.pointerId !== pointer) return;
    ctx.lineTo(...point(event));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...point(event));
  };
  canvas.onpointercancel =
    canvas.onpointerup =
    canvas.onlostpointercapture =
      (event) => {
        if (event.pointerId === pointer) pointer = null;
      };
  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawn = false;
    },
    image() {
      return drawn ? canvas.toDataURL("image/png") : "";
    },
  };
}

async function render() {
  const turn = ++sequence;
  const state = get();
  const client =
    findClient(requested) ||
    state.clients.find(
      (c) => c.status !== "Lead" && c.name.startsWith("Sample Client"),
    ) ||
    state.clients.find((c) => c.status !== "Lead");
  if (!client) {
    room.innerHTML =
      "<h1>No sample contract available</h1><p>Create a client contract in the studio to try signing.</p>";
    return;
  }
  activeId = client.id;
  displayedStatus = client.status;
  document.querySelector("#studio").textContent = state.settings.businessName;
  const fallback =
    requested !== client.id
      ? '<p class="sign-demo-note">Showing a sample agreement from this browser.</p>'
      : "";
  const agreement = await contractHTML(client);
  if (turn !== sequence) return;
  if (client.status === "Signed") {
    const record = client.signedRecord || {
      name: client.name,
      at: client.timeline?.find((s) => s.label === "Signed")?.at,
      browser: "Sample browser",
    };
    const drawing = /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(
      record.drawing || "",
    )
      ? '<img class="signature-image" alt="Drawn client signature" src="' +
        esc(record.drawing) +
        '">'
      : "";
    room.innerHTML =
      fallback +
      '<section class="sign-success"><h1>Contract signed</h1><p>Thank you, ' +
      esc(record.name) +
      '. Your sample signing record is saved in this browser.</p><dl class="client-facts"><dt>Signed by</dt><dd>' +
      esc(record.name) +
      "</dd><dt>Date and time</dt><dd>" +
      dateLabel(record.at, true) +
      "</dd><dt>Browser</dt><dd>" +
      esc(record.browser) +
      "</dd></dl>" +
      drawing +
      '<button class="client-primary" id="download">Download copy</button></section>' +
      agreement;
    room.querySelector("#download").onclick = () => window.print();
    return;
  }
  room.innerHTML =
    fallback +
    '<div class="sign-intro"><h1>Your session agreement</h1><p>Review the sample agreement below, then sign with your name.</p></div>' +
    agreement +
    '<form class="sign-form"><h2>Sign your agreement</h2><label class="client-field">Full name<input name="signer" autocomplete="name" required maxlength="140"></label>' +
    '<p id="canvas-label">Draw your signature <span>(optional)</span></p><canvas width="900" height="245" aria-labelledby="canvas-label">You can sign with the full name field above.</canvas>' +
    '<button class="client-button" type="button" id="clear">Clear signature</button>' +
    '<label class="client-check"><input name="agree" type="checkbox" required>I agree to sign electronically.</label>' +
    '<button class="client-primary" type="submit">Sign contract</button></form>';
  const form = room.querySelector("form");
  const drawing = enableDrawing(form.querySelector("canvas"));
  form.querySelector("#clear").onclick = () => drawing.clear();
  form.elements.signer.oninput = () =>
    form.elements.signer.setCustomValidity("");
  form.onsubmit = (event) => {
    event.preventDefault();
    const name = form.elements.signer.value.trim();
    if (!name) {
      form.elements.signer.setCustomValidity("Enter your full name to sign.");
      form.reportValidity();
      return;
    }
    sign(client.id, name, browserName(), drawing.image());
    window.scrollTo({ top: 0 });
  };
}

await ready;
markViewed(requested);
subscribe(() => {
  const client = findClient(activeId);
  if (!client || client.status !== displayedStatus) render();
});
await render();
