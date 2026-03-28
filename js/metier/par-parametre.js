/**
 * Validation métier : tdelParParametre.json
 */

const KEYS = ["par_code", "par_valeur", "par_description"];

/**
 * @param {unknown} data
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateParParametre(data) {
  if (!Array.isArray(data)) {
    return { ok: false, message: "La racine JSON doit être un tableau." };
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const prefix = `Ligne ${i + 1}`;

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, message: `${prefix} : un objet était attendu.` };
    }

    for (const key of KEYS) {
      if (!(key in row)) {
        return { ok: false, message: `${prefix} : propriété manquante « ${key} ».` };
      }
      if (typeof row[key] !== "string") {
        return {
          ok: false,
          message: `${prefix} : « ${key} » doit être une chaîne.`,
        };
      }
    }
  }

  return { ok: true };
}
