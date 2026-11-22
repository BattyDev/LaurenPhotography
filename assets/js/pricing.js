const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(amount) {
  const dollars = Number(amount) || 0;
  return (Number.isInteger(dollars) ? wholeDollars : currency).format(dollars);
}

// The business calendar uses local days, including the entire sale end date.
export function dateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function activeSale(state, now = new Date()) {
  const day = dateKey(now);
  const sale = state.sale;
  return sale && sale.start <= day && day <= sale.end ? sale : null;
}

export function discountLabel(sale) {
  return sale.type === "percent"
    ? `${sale.value}% off`
    : `${money(sale.value)} off`;
}

export function quote(pkg, state, now = new Date()) {
  const original = Number(pkg.price);
  const live = activeSale(state, now);
  const sale =
    live && (!live.packageIds || live.packageIds.includes(pkg.id))
      ? live
      : null;
  if (!sale) return { original, price: original, sale: null, note: "" };
  const reduction =
    sale.type === "percent" ? (original * sale.value) / 100 : sale.value;
  const price = Math.max(0, Math.round(original - reduction));
  const note = ` (includes ${sale.name} sale: ${discountLabel(sale)})`;
  return { original, price, sale, note };
}

export function countdown(sale, now = new Date()) {
  const end = new Date(sale.end + "T00:00:00");
  end.setDate(end.getDate() + 1);
  const remaining = Math.ceil((end.getTime() - now.getTime()) / 1000);
  if (remaining <= 0) return "Sale ended";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m ${remaining % 60}s`;
}
