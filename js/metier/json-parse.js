/**
 * Parse JSON depuis texte ; erreurs capturées pour l’IHM.
 * @param {string} text
 * @returns {{ ok: true, data: unknown } | { ok: false, error: string }}
 */
export function parseJsonText(text) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
