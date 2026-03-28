/**
 * Référentiel des fichiers JSON attendus (noms exacts et identifiants métier).
 */

export const EXPECTED_FILES = [
  {
    id: "gde",
    fileName: "tdel_gde_gest_environnements.json",
    label: "Environnements",
  },
  {
    id: "gsa",
    fileName: "tdelGsaGestServicesAnnuels.json",
    label: "Services annuels",
  },
  {
    id: "gsp",
    fileName: "tdelGspGestSvcApplicatifs.json",
    label: "Services applicatifs",
  },
  {
    id: "par",
    fileName: "tdelParParametre.json",
    label: "Paramètres",
  },
];

/**
 * @param {string} name
 * @returns {typeof EXPECTED_FILES[0] | undefined}
 */
export function findExpectedByFileName(name) {
  const lower = name.toLowerCase();
  return EXPECTED_FILES.find((e) => e.fileName.toLowerCase() === lower);
}
