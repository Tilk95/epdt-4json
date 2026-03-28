/**
 * Téléchargement d’un fichier JSON (contenu actuel en mémoire).
 */

/**
 * @param {string} fileName nom du fichier (ex. tdelParParametre.json)
 * @param {string} rawText contenu UTF-8
 */
export function downloadJsonFile(fileName, rawText) {
  const blob = new Blob([rawText], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
