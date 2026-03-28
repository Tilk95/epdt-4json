/**
 * État « modifié » : comparaison du JSON courant avec la version chargée initialement.
 */

/**
 * @param {import("./file-store.js").FileEntry} entry
 * @returns {boolean}
 */
export function isEntryModified(entry) {
  if (entry.status !== "loaded") {
    return false;
  }
  if (!("baselineRawText" in entry)) {
    return false;
  }
  const baseline = /** @type {string} */ (entry.baselineRawText);
  return entry.rawText !== baseline;
}
