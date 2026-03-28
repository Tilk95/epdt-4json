/**
 * Ligne vide par type de fichier (ajout d’enregistrement).
 */

/**
 * @param {string} fileId
 * @returns {Record<string, unknown>}
 */
export function getDefaultRow(fileId) {
  switch (fileId) {
    case "gde":
      return {
        gde_environnement: "",
        gde_serveur: "",
        gde_svc_user: null,
        gde_svc_password: null,
      };
    case "gsa":
      return {
        gsa_libelle_sa: "",
        gsa_date_debut: "",
        gsa_date_fin: "",
        gsa_date_publication: "",
        gsa_date_dga: "",
        gsa_ind_actif: "",
        gsa_date_construction: "",
        gsa_liste_evenement_du_sa: null,
        gsa_liste_periodes_de_circu: null,
        gsa_id_basic: "",
        gsa_date_plancher: "",
      };
    case "gsp":
      return {
        gsp_service: "",
        gsp_uri: "",
        gsp_header_contenu: null,
        gsp_header_envoyer: "false",
      };
    case "par":
      return {
        par_code: "",
        par_valeur: "",
        par_description: "",
      };
    default:
      return {};
  }
}
