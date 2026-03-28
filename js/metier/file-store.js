import { EXPECTED_FILES } from "./expected-files.js";

/**
 * @typedef {"missing" | "loaded" | "error"} FileStatus
 * @typedef {{ status: "missing" }} MissingEntry
 * @typedef {{ status: "loaded", data: unknown, rawText: string, baselineRawText: string }} LoadedEntry
 * @typedef {{ status: "error", message: string }} ErrorEntry
 * @typedef {MissingEntry | LoadedEntry | ErrorEntry} FileEntry
 */

/**
 * État des fichiers attendus : une entrée par nom de fichier connu.
 */
export function createFileStore() {
  /** @type {Map<string, FileEntry>} */
  const byName = new Map();

  /**
   * @param {string} fileName
   * @param {FileEntry} entry
   */
  function set(fileName, entry) {
    byName.set(fileName, entry);
  }

  /**
   * @param {string} fileName
   * @returns {FileEntry | undefined}
   */
  function get(fileName) {
    return byName.get(fileName);
  }

  function clear() {
    byName.clear();
  }

  /**
   * Vue pour l’IHM : chaque fichier attendu + son état.
   * @returns {Array<{ id: string, fileName: string, label: string, entry: FileEntry }>}
   */
  function listExpectedWithState() {
    return EXPECTED_FILES.map((def) => {
      const entry = byName.get(def.fileName) ?? { status: "missing" };
      return {
        id: def.id,
        fileName: def.fileName,
        label: def.label,
        entry,
      };
    });
  }

  return { set, get, clear, listExpectedWithState };
}
