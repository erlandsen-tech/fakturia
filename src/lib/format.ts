export function fmtKr(n: number, withPrefix = true): string {
  const formatted = n.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withPrefix ? `kr ${formatted}` : formatted;
}

export function fmtDate(iso: string, mode: "short" | "long" = "short"): string {
  const d = new Date(iso);
  if (mode === "long") {
    return d.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
