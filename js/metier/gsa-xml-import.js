/**
 * Lecture XML « vues SA » (VueSA) et conversion vers une ligne tdelGsaGestServicesAnnuels.json.
 */

import {
  isoInstantToParisDateYmd,
  isoInstantToParisDateTimeLabel,
} from "./paris-date.js";
import { uuidToGsaIdBasic } from "./gsa-id-basic.js";

/**
 * @typedef {object} VueSaParsed
 * @property {string} id
 * @property {string} libelle
 * @property {string} dateDebutIso
 * @property {string} dateFinIso
 * @property {string | null} dateDebutPublicationProjetHoraireIso
 * @property {string} debutParisLabel
 * @property {string} finParisLabel
 */

/**
 * @param {Element} el
 * @param {string} localName
 */
function childText(el, localName) {
  for (const c of el.children) {
    if (c.localName === localName) {
      return (c.textContent ?? "").trim();
    }
  }
  return "";
}

/**
 * Clé de comparaison pour l’unicité du libellé SA (alignée sur la validation JSON).
 * @param {string} libelle
 */
export function normalizeGsaLibelleSaKey(libelle) {
  return String(libelle).trim().toLowerCase();
}

/**
 * @param {VueSaParsed[]} services
 * @returns {string | null} message d’erreur si doublons, sinon null
 */
function duplicateLibelleMessageIfAny(services) {
  /** @type {Map<string, string[]>} */
  const byKey = new Map();
  for (const s of services) {
    const k = normalizeGsaLibelleSaKey(s.libelle);
    if (!byKey.has(k)) {
      byKey.set(k, []);
    }
    byKey.get(k).push(s.libelle);
  }
  const parts = [];
  for (const arr of byKey.values()) {
    if (arr.length > 1) {
      parts.push(`« ${arr[0]} » (${arr.length} occurrences)`);
    }
  }
  if (parts.length === 0) {
    return null;
  }
  return `Le fichier XML contient plusieurs entrées pour le même libellé SA : ${parts.join(", ")}. Corrigez le fichier avant import.`;
}

/**
 * Libellés SA déjà présents dans le JSON « Services annuels » chargé (clés normalisées).
 * @param {import("./file-store.js").FileEntry | undefined} entry
 * @returns {Set<string>}
 */
export function existingGsaLibelleKeysFromStoreEntry(entry) {
  const set = new Set();
  if (!entry || entry.status !== "loaded" || !Array.isArray(entry.data)) {
    return set;
  }
  for (const row of entry.data) {
    if (
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      typeof row.gsa_libelle_sa === "string"
    ) {
      set.add(normalizeGsaLibelleSaKey(row.gsa_libelle_sa));
    }
  }
  return set;
}

/**
 * Ne garde que les VueSA dont le libellé n’existe pas déjà dans le jeu GSA cible.
 * @param {VueSaParsed[]} services
 * @param {Set<string>} existingKeys
 * @returns {VueSaParsed[]}
 */
export function filterVueSaServicesNotYetInGsa(services, existingKeys) {
  return services.filter(
    (s) => !existingKeys.has(normalizeGsaLibelleSaKey(s.libelle)),
  );
}

/**
 * @param {string} xmlText
 * @returns {{ ok: true, services: VueSaParsed[] } | { ok: false, message: string }}
 */
export function parseVueSaXml(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) {
    return { ok: false, message: "XML invalide ou mal formé." };
  }

  /** @type {VueSaParsed[]} */
  const services = [];
  const nodes = doc.getElementsByTagName("VueSA");
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const id = childText(el, "id");
    const libelle = childText(el, "libelle");
    const dateDebutIso = childText(el, "dateDebut");
    const dateFinIso = childText(el, "dateFin");
    const pubRaw = childText(el, "dateDebutPublicationProjetHoraire");
    const dateDebutPublicationProjetHoraireIso = pubRaw.length > 0 ? pubRaw : null;

    if (!libelle || !dateDebutIso || !dateFinIso || !id) {
      continue;
    }

    const debutParisLabel = isoInstantToParisDateTimeLabel(dateDebutIso);
    const finParisLabel = isoInstantToParisDateTimeLabel(dateFinIso);

    services.push({
      id,
      libelle,
      dateDebutIso,
      dateFinIso,
      dateDebutPublicationProjetHoraireIso,
      debutParisLabel,
      finParisLabel,
    });
  }

  if (services.length === 0) {
    return {
      ok: false,
      message:
        "Aucun service annuel exploitable : vérifiez la présence de balises VueSA avec id, libelle, dateDebut et dateFin.",
    };
  }

  const dupMsg = duplicateLibelleMessageIfAny(services);
  if (dupMsg) {
    return { ok: false, message: dupMsg };
  }

  return { ok: true, services };
}

/**
 * Construit une ligne JSON GSA conforme au mapping spec (Paris + RG01 + dates dérivées du libellé).
 * @param {VueSaParsed} v
 * @returns {Record<string, unknown>}
 */
export function buildGsaRowFromVueSa(v) {
  const lib = v.libelle;
  const year = parseInt(lib.slice(-4), 10);
  const y1 = Number.isFinite(year) ? year - 1 : new Date().getFullYear() - 1;
  const y1s = String(y1);

  const pubYmd = v.dateDebutPublicationProjetHoraireIso
    ? isoInstantToParisDateYmd(v.dateDebutPublicationProjetHoraireIso)
    : null;

  return {
    gsa_libelle_sa: lib,
    gsa_date_debut: isoInstantToParisDateYmd(v.dateDebutIso),
    gsa_date_fin: isoInstantToParisDateYmd(v.dateFinIso),
    gsa_date_publication: pubYmd,
    gsa_date_dga: `${y1s}-07-01`,
    gsa_ind_actif: "1",
    gsa_date_construction: `${y1s}-01-01`,
    gsa_liste_evenement_du_sa: null,
    gsa_liste_periodes_de_circu: null,
    gsa_id_basic: uuidToGsaIdBasic(v.id),
    gsa_date_plancher: `${y1s}-03-01`,
  };
}
