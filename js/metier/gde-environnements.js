/**
 * Validation métier du fichier tdel_gde_gest_environnements.json
 */

const KEYS = [
  "gde_environnement",
  "gde_serveur",
  "gde_svc_user",
  "gde_svc_password",
];

/**
 * @param {unknown} data
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateGdeEnvironnements(data) {
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
      const v = row[key];
      if (key === "gde_environnement" || key === "gde_serveur") {
        if (typeof v !== "string") {
          return {
            ok: false,
            message: `${prefix} : « ${key} » doit être une chaîne.`,
          };
        }
      } else if (v !== null && typeof v !== "string") {
        return {
          ok: false,
          message: `${prefix} : « ${key} » doit être une chaîne ou null.`,
        };
      }
    }
  }

  return { ok: true };
}
