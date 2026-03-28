/**
 * Dates « civiles » au fuseau Europe/Paris (aligné sur la spec du mapping XML → GSA).
 */

const PARIS = "Europe/Paris";

/**
 * @param {string} iso Instant ISO 8601 (ex. depuis le XML)
 * @returns {string} Date AAAA-MM-JJ (calendrier Paris)
 */
export function isoInstantToParisDateYmd(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

/**
 * Affichage lisible date + heure (fuseau Paris).
 * @param {string} iso
 */
export function isoInstantToParisDateTimeLabel(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString("fr-FR", {
    timeZone: PARIS,
    dateStyle: "short",
    timeStyle: "medium",
  });
}
