/**
 * Mutations sur le tableau JSON en mémoire + validation globale + resynchronisation du texte brut.
 */

import { validateGdeEnvironnements } from "./gde-environnements.js";
import { validateGsaServicesAnnuels } from "./gsa-services-annuels.js";
import { validateGspServicesApplicatifs } from "./gsp-services-applicatifs.js";
import { validateParParametre } from "./par-parametre.js";
import { getDefaultRow } from "./default-rows.js";

const VALIDATORS = {
  gde: validateGdeEnvironnements,
  gsa: validateGsaServicesAnnuels,
  gsp: validateGspServicesApplicatifs,
  par: validateParParametre,
};

/**
 * @param {string} fileId
 * @param {unknown} data
 */
export function validateDataset(fileId, data) {
  const fn = VALIDATORS[fileId];
  if (!fn) {
    return { ok: true };
  }
  return fn(data);
}

/**
 * @param {unknown} row
 */
function cloneRow(row) {
  return JSON.parse(JSON.stringify(row));
}

/**
 * @param {import("./file-store.js").FileEntry} entry
 * @returns {object[] | null}
 */
function getArrayCopy(entry) {
  if (entry.status !== "loaded" || !Array.isArray(entry.data)) {
    return null;
  }
  return entry.data.map((r) => cloneRow(r));
}

/**
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 * @param {object[]} newData
 */
function commit(store, fileName, fileId, newData) {
  const v = validateDataset(fileId, newData);
  if (!v.ok) {
    return { ok: false, message: v.message };
  }
  const rawText = JSON.stringify(newData, null, 2);
  const prev = store.get(fileName);
  const baselineRawText =
    prev?.status === "loaded"
      ? "baselineRawText" in prev && typeof prev.baselineRawText === "string"
        ? prev.baselineRawText
        : prev.rawText
      : rawText;
  store.set(fileName, {
    status: "loaded",
    data: newData,
    rawText,
    baselineRawText,
  });
  return { ok: true };
}

/**
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 * @param {number} rowIndex
 */
export function deleteRow(store, fileName, fileId, rowIndex) {
  const entry = store.get(fileName);
  const data = getArrayCopy(entry);
  if (!data || rowIndex < 0 || rowIndex >= data.length) {
    return { ok: false, message: "Suppression impossible." };
  }
  data.splice(rowIndex, 1);
  return commit(store, fileName, fileId, data);
}

/**
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 * @param {number} rowIndex
 * @param {object} row
 */
export function updateRow(store, fileName, fileId, rowIndex, row) {
  const entry = store.get(fileName);
  const data = getArrayCopy(entry);
  if (!data || rowIndex < 0 || rowIndex >= data.length) {
    return { ok: false, message: "Mise à jour impossible." };
  }
  data[rowIndex] = cloneRow(row);
  return commit(store, fileName, fileId, data);
}

/**
 * Insère une nouvelle ligne après `afterIndex` (−1 = début).
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 * @param {number} afterIndex
 * @param {object} [row]
 */
export function insertRowAfter(store, fileName, fileId, afterIndex, row) {
  const entry = store.get(fileName);
  const data = getArrayCopy(entry);
  if (!data) {
    return { ok: false, message: "Ajout impossible." };
  }
  const newRow = row ?? getDefaultRow(fileId);
  const pos = afterIndex < 0 ? 0 : Math.min(afterIndex + 1, data.length);
  data.splice(pos, 0, cloneRow(newRow));
  return commit(store, fileName, fileId, data);
}

/**
 * Initialise un tableau JSON vide en mémoire si le fichier n’est pas encore chargé.
 * Refuse si l’entrée est en erreur (JSON invalide au dépôt).
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 */
export function initEmptyDatasetIfMissing(store, fileName, fileId) {
  const e = store.get(fileName);
  if (e?.status === "loaded") {
    return { ok: true };
  }
  if (e?.status === "error") {
    return {
      ok: false,
      message:
        "Le fichier JSON est en erreur : corrigez-le ou rechargez-le avant d’importer du XML.",
    };
  }
  const v = validateDataset(fileId, []);
  if (!v.ok) {
    return v;
  }
  store.set(fileName, {
    status: "loaded",
    data: [],
    rawText: "[]",
    baselineRawText: "[]",
  });
  return { ok: true };
}

/**
 * Ajoute des lignes en fin de tableau (après initialisation si nécessaire).
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {string} fileName
 * @param {string} fileId
 * @param {object[]} rows
 */
export function appendRows(store, fileName, fileId, rows) {
  const init = initEmptyDatasetIfMissing(store, fileName, fileId);
  if (!init.ok) {
    return init;
  }
  const entry = store.get(fileName);
  const data = getArrayCopy(entry);
  if (!data) {
    return { ok: false, message: "État du fichier inattendu." };
  }
  const newData = [...data, ...rows.map((r) => cloneRow(r))];
  return commit(store, fileName, fileId, newData);
}
