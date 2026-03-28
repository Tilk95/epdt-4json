/**
 * Validation métier : tdelGsaGestServicesAnnuels.json
 */

const KEYS = [
  "gsa_libelle_sa",
  "gsa_date_debut",
  "gsa_date_fin",
  "gsa_date_publication",
  "gsa_date_dga",
  "gsa_ind_actif",
  "gsa_date_construction",
  "gsa_liste_evenement_du_sa",
  "gsa_liste_periodes_de_circu",
  "gsa_id_basic",
  "gsa_date_plancher",
];

/**
 * @param {unknown} data
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateGsaServicesAnnuels(data) {
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
      if (
        key === "gsa_liste_evenement_du_sa" ||
        key === "gsa_liste_periodes_de_circu"
      ) {
        if (v !== null && typeof v !== "object") {
          return {
            ok: false,
            message: `${prefix} : « ${key} » doit être null, un objet ou un tableau.`,
          };
        }
      } else if (key === "gsa_date_publication" && v === null) {
        /* autorisé si publication absente (ex. import XML sans dateDebutPublicationProjetHoraire) */
      } else if (typeof v !== "string") {
        return {
          ok: false,
          message: `${prefix} : « ${key} » doit être une chaîne.`,
        };
      }
    }
  }

  /** Unicité des libellés SA (comparaison sans tenir compte de la casse ni des espaces en bord). */
  const seenLibelles = new Set();
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      continue;
    }
    const lib = row.gsa_libelle_sa;
    if (typeof lib !== "string") {
      continue;
    }
    const key = lib.trim().toLowerCase();
    if (seenLibelles.has(key)) {
      return {
        ok: false,
        message: `Le libellé SA « ${lib} » est présent plusieurs fois (unicité requise).`,
      };
    }
    seenLibelles.add(key);
  }

  return { ok: true };
}
