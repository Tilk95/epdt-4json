/**
 * RG01 : UUID → chaîne hex des codes ASCII (majuscules, sans tirets).
 * @param {string} uuid
 * @returns {string}
 */
export function uuidToGsaIdBasic(uuid) {
  const s = String(uuid).toUpperCase().replace(/-/g, "");
  let out = "";
  for (let i = 0; i < s.length; i++) {
    out += s.charCodeAt(i).toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}
