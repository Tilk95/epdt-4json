/**
 * Validation métier : tdelGspGestSvcApplicatifs.json
 *
 * En-têtes (`gsp_header_contenu`) : plusieurs blocs peuvent être séparés par « | » côté données ;
 * aucune contrainte sur les noms/valeurs d’en-tête au-delà du type (chaîne ou null).
 */

const KEYS = ["gsp_service", "gsp_uri", "gsp_header_contenu", "gsp_header_envoyer"];

/**
 * @param {unknown} data
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateGspServicesApplicatifs(data) {
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
      if (key === "gsp_header_contenu") {
        if (v !== null && typeof v !== "string") {
          return {
            ok: false,
            message: `${prefix} : « gsp_header_contenu » doit être une chaîne ou null.`,
          };
        }
      } else if (typeof v !== "string") {
        return {
          ok: false,
          message: `${prefix} : « ${key} » doit être une chaîne.`,
        };
      }
    }

    const envoyer = row.gsp_header_envoyer;
    if (envoyer !== "true" && envoyer !== "false") {
      return {
        ok: false,
        message: `${prefix} : « gsp_header_envoyer » doit valoir exactement « true » ou « false » (chaîne).`,
      };
    }
  }

  return { ok: true };
}
