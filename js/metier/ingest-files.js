import { findExpectedByFileName } from "./expected-files.js";
import { parseJsonText } from "./json-parse.js";
import { validateGdeEnvironnements } from "./gde-environnements.js";
import { validateGsaServicesAnnuels } from "./gsa-services-annuels.js";
import { validateGspServicesApplicatifs } from "./gsp-services-applicatifs.js";
import { validateParParametre } from "./par-parametre.js";

/**
 * Lit une liste de fichiers utilisateur, ne retient que les noms attendus,
 * parse le JSON et met à jour le store.
 * @param {ReturnType<import("./file-store.js").createFileStore>} store
 * @param {FileList | File[]} fileList
 * @returns {Promise<{ loaded: number, errors: string[] }>}
 */
export async function ingestFiles(store, fileList) {
  const files = Array.from(fileList);
  const errors = [];
  let loaded = 0;

  for (const file of files) {
    const expected = findExpectedByFileName(file.name);
    if (!expected) {
      continue;
    }
    let text;
    try {
      text = await file.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.set(expected.fileName, { status: "error", message: `Lecture : ${msg}` });
      errors.push(`${file.name} : ${msg}`);
      continue;
    }

    const parsed = parseJsonText(text);
    if (!parsed.ok) {
      store.set(expected.fileName, {
        status: "error",
        message: `JSON invalide : ${parsed.error}`,
      });
      errors.push(`${file.name} : JSON invalide`);
      continue;
    }

    const validators = {
      gde: validateGdeEnvironnements,
      gsa: validateGsaServicesAnnuels,
      gsp: validateGspServicesApplicatifs,
      par: validateParParametre,
    };
    const validate = validators[/** @type {keyof typeof validators} */ (expected.id)];
    if (validate) {
      const v = validate(parsed.data);
      if (!v.ok) {
        store.set(expected.fileName, { status: "error", message: v.message });
        errors.push(`${file.name} : ${v.message}`);
        continue;
      }
    }

    store.set(expected.fileName, {
      status: "loaded",
      data: parsed.data,
      rawText: text,
      baselineRawText: text,
    });
    loaded += 1;
  }

  return { loaded, errors };
}
