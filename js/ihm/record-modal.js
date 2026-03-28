/**
 * Modale d’actions sur un enregistrement : voir, ajouter, supprimer, modifier.
 */

import { getDefaultRow } from "../metier/default-rows.js";
import {
  deleteRow,
  insertRowAfter,
  updateRow,
} from "../metier/mutate-file-data.js";

/** @typedef {'voir' | 'ajouter' | 'supprimer' | 'modifier'} RowAction */

/**
 * Édition GSP `gsp_header_contenu` : affichage avec un saut de ligne à la place de chaque « | ».
 * @param {string} s
 */
function pipeSeparatedToLines(s) {
  return s.split("|").join("\n");
}

/**
 * Enregistrement : regroupe les lignes non vides (après trim) avec « | ».
 * @param {string} s
 */
function linesToPipeSeparated(s) {
  return s
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("|");
}

/**
 * @param {HTMLDialogElement} dialog
 * @param {HTMLElement} titleEl
 * @param {HTMLElement} bodyEl
 * @param {HTMLElement} footEl
 * @param {HTMLButtonElement} closeBtn
 * @param {object} opts
 * @param {ReturnType<import("../metier/file-store.js").createFileStore>} opts.store
 * @param {() => void} opts.onSuccess
 */
export function initRecordModal(dialog, titleEl, bodyEl, footEl, closeBtn, opts) {
  const { store, onSuccess } = opts;

  function close() {
    dialog.close();
    bodyEl.replaceChildren();
    footEl.replaceChildren();
  }

  closeBtn.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  /**
   * @param {object} p
   * @param {RowAction} p.action
   * @param {string} p.fileId
   * @param {string} p.fileName
   * @param {number} p.rowIndex
   * @param {object} [p.row]
   */
  function open(p) {
    titleEl.textContent = titleFor(p.action, p.fileId);
    bodyEl.replaceChildren();
    footEl.replaceChildren();

    if (p.action === "voir") {
      const row =
        p.row && typeof p.row === "object" ? /** @type {object} */ (p.row) : {};
      bodyEl.append(buildViewDl(row, p.fileId));
      addFooterClose(footEl, close);
      dialog.showModal();
      return;
    }

    if (p.action === "supprimer") {
      const msg = document.createElement("p");
      msg.className = "record-modal__warn";
      msg.textContent =
        "Supprimer cet enregistrement ? Cette action est appliquée aux données en mémoire (pas d’écriture disque automatique).";
      bodyEl.append(msg);
      const btnCancel = mkBtn("Annuler", "btn btn--secondary", close);
      const btnOk = mkBtn("Supprimer", "btn btn--danger", () => {
        const r = deleteRow(store, p.fileName, p.fileId, p.rowIndex);
        if (!r.ok) {
          alert(r.message ?? "Erreur");
          return;
        }
        close();
        onSuccess();
      });
      footEl.append(btnCancel, btnOk);
      dialog.showModal();
      return;
    }

    if (p.action === "ajouter") {
      const draft = getDefaultRow(p.fileId);
      bodyEl.append(buildForm(p.fileId, draft));
      const btnCancel = mkBtn("Annuler", "btn btn--secondary", close);
      const btnSave = mkBtn("Ajouter", "btn btn--primary", () => {
        const row = readForm(p.fileId, bodyEl);
        if (!row) {
          return;
        }
        const r = insertRowAfter(store, p.fileName, p.fileId, p.rowIndex, row);
        if (!r.ok) {
          alert(r.message ?? "Validation échouée");
          return;
        }
        close();
        onSuccess();
      });
      footEl.append(btnCancel, btnSave);
      dialog.showModal();
      return;
    }

    if (p.action === "modifier") {
      const row =
        p.row && typeof p.row === "object"
          ? p.row
          : getDefaultRow(p.fileId);
      bodyEl.append(buildForm(p.fileId, row));
      const btnCancel = mkBtn("Annuler", "btn btn--secondary", close);
      const btnSave = mkBtn("Enregistrer", "btn btn--primary", () => {
        const row = readForm(p.fileId, bodyEl);
        if (!row) {
          return;
        }
        const r = updateRow(store, p.fileName, p.fileId, p.rowIndex, row);
        if (!r.ok) {
          alert(r.message ?? "Validation échouée");
          return;
        }
        close();
        onSuccess();
      });
      footEl.append(btnCancel, btnSave);
      dialog.showModal();
    }
  }

  return { open, close };
}

/**
 * @param {RowAction} action
 * @param {string} fileId
 */
function titleFor(action, fileId) {
  const t = {
    voir: "Voir l’enregistrement",
    ajouter: "Ajouter un enregistrement",
    supprimer: "Supprimer l’enregistrement",
    modifier: "Modifier l’enregistrement",
  };
  return `${t[action]} (${fileId})`;
}

/**
 * @param {object} row
 * @param {string} fileId
 */
function buildViewDl(row, fileId) {
  const dl = document.createElement("dl");
  dl.className = "record-modal__dl";
  for (const [k, v] of Object.entries(row)) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    if (v === null || v === undefined) {
      dd.textContent = "null";
    } else if (typeof v === "object") {
      dd.append(document.createTextNode(JSON.stringify(v)));
    } else {
      const str = String(v);
      if (fileId === "gsp" && k === "gsp_header_contenu") {
        dd.classList.add("record-modal__dd--multiline");
        dd.textContent = pipeSeparatedToLines(str);
      } else {
        dd.textContent = str;
      }
    }
    dl.append(dt, dd);
  }
  return dl;
}

/**
 * @param {HTMLElement} foot
 * @param {() => void} onClose
 */
function addFooterClose(foot, onClose) {
  foot.append(mkBtn("Fermer", "btn btn--secondary", onClose));
}

/**
 * @param {string} label
 * @param {string} className
 * @param {() => void} onClick
 */
function mkBtn(label, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

/**
 * @typedef {{ key: string, label: string, kind: string, pipeAsNewline?: boolean }} FormFieldDef
 */

/** @type {Record<string, FormFieldDef[]>} */
const FORM_FIELDS = {
  gde: [
    { key: "gde_environnement", label: "Environnement", kind: "string" },
    { key: "gde_serveur", label: "Serveur", kind: "string" },
    { key: "gde_svc_user", label: "Utilisateur", kind: "nullableString" },
    { key: "gde_svc_password", label: "Mot de passe", kind: "nullableString" },
  ],
  gsa: [
    { key: "gsa_libelle_sa", label: "Libellé SA", kind: "string" },
    { key: "gsa_date_debut", label: "Date début", kind: "string" },
    { key: "gsa_date_fin", label: "Date fin", kind: "string" },
    { key: "gsa_date_publication", label: "Publication", kind: "string" },
    { key: "gsa_date_dga", label: "DGA", kind: "string" },
    { key: "gsa_ind_actif", label: "Actif", kind: "string" },
    { key: "gsa_date_construction", label: "Construction", kind: "string" },
    { key: "gsa_liste_evenement_du_sa", label: "Liste événements (JSON ou vide)", kind: "jsonNull" },
    { key: "gsa_liste_periodes_de_circu", label: "Liste périodes (JSON ou vide)", kind: "jsonNull" },
    { key: "gsa_id_basic", label: "ID basic", kind: "string" },
    { key: "gsa_date_plancher", label: "Date plancher", kind: "string" },
  ],
  gsp: [
    { key: "gsp_service", label: "Service", kind: "string" },
    { key: "gsp_uri", label: "URI", kind: "string" },
    {
      key: "gsp_header_contenu",
      label:
        "En-têtes (une ligne par bloc « Nom: valeur » ; enregistrement → séparés par |)",
      kind: "nullableString",
      pipeAsNewline: true,
    },
    { key: "gsp_header_envoyer", label: "Envoyer en-têtes", kind: "boolString" },
  ],
  par: [
    { key: "par_code", label: "Code", kind: "string" },
    { key: "par_valeur", label: "Valeur", kind: "string" },
    { key: "par_description", label: "Description", kind: "string" },
  ],
};

/**
 * @param {string} fileId
 * @param {object} row
 */
function buildForm(fileId, row) {
  const form = document.createElement("div");
  form.className = "record-modal__form";
  const fields = FORM_FIELDS[fileId];
  if (!fields) {
    form.textContent = "Formulaire non défini pour ce type.";
    return form;
  }
  for (const f of fields) {
    const grp = document.createElement("div");
    grp.className = "record-modal__field";
    grp.dataset.fieldKey = f.key;

    const lab = document.createElement("label");
    lab.className = "record-modal__label-text";
    lab.textContent = f.label;

    const val = row[f.key];
    if (f.kind === "string") {
      const ta = document.createElement("textarea");
      ta.name = f.key;
      ta.rows = 2;
      ta.value = val !== undefined && val !== null ? String(val) : "";
      ta.className = "record-modal__textarea";
      grp.append(lab, ta);
    } else if (f.kind === "nullableString") {
      const ta = document.createElement("textarea");
      ta.name = f.key;
      const rawStr = val !== null && val !== undefined ? String(val) : "";
      const displayStr =
        f.pipeAsNewline && rawStr.length > 0
          ? pipeSeparatedToLines(rawStr)
          : rawStr;
      const lineCount = displayStr.split(/\r?\n/).length;
      ta.rows = f.pipeAsNewline
        ? Math.min(12, Math.max(3, lineCount))
        : 2;
      ta.value = displayStr;
      ta.disabled = val === null;
      ta.className = "record-modal__textarea";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "record-modal__null-cb";
      cb.checked = val === null;
      cb.addEventListener("change", () => {
        ta.disabled = cb.checked;
        if (cb.checked) {
          ta.value = "";
        }
      });
      const span = document.createElement("span");
      span.className = "record-modal__hint";
      span.textContent = " Valeur nulle";
      grp.append(lab, ta, cb, span);
    } else if (f.kind === "boolString") {
      const sel = document.createElement("select");
      sel.name = f.key;
      sel.className = "record-modal__select";
      const raw = val !== undefined && val !== null ? String(val).toLowerCase() : "";
      const current = raw === "true" ? "true" : "false";
      for (const opt of [
        { v: "true", label: "true (envoyer)" },
        { v: "false", label: "false (ne pas envoyer)" },
      ]) {
        const o = document.createElement("option");
        o.value = opt.v;
        o.textContent = opt.label;
        if (opt.v === current) {
          o.selected = true;
        }
        sel.append(o);
      }
      grp.append(lab, sel);
    } else if (f.kind === "jsonNull") {
      const ta = document.createElement("textarea");
      ta.name = f.key;
      ta.rows = 3;
      ta.className = "record-modal__textarea";
      if (val === null || val === undefined) {
        ta.value = "";
        ta.disabled = true;
      } else {
        ta.value = JSON.stringify(val);
      }
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "record-modal__null-cb";
      cb.checked = val === null;
      cb.addEventListener("change", () => {
        ta.disabled = cb.checked;
        if (cb.checked) {
          ta.value = "";
        }
      });
      const hint = document.createElement("span");
      hint.className = "record-modal__hint";
      hint.textContent = " Valeur JSON nulle";
      grp.append(lab, ta, cb, hint);
    }
    form.append(grp);
  }
  return form;
}

/**
 * @param {string} fileId
 * @param {HTMLElement} container
 * @returns {object | null}
 */
function readForm(fileId, container) {
  const form = container.querySelector(".record-modal__form");
  if (!form) {
    return null;
  }
  const fields = FORM_FIELDS[fileId];
  if (!fields) {
    return null;
  }
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const f of fields) {
    const grp = form.querySelector(`[data-field-key="${f.key}"]`);
    if (!grp) {
      return null;
    }
    if (f.kind === "string") {
      const ta = grp.querySelector(`textarea[name="${f.key}"]`);
      if (!(ta instanceof HTMLTextAreaElement)) {
        return null;
      }
      out[f.key] = ta.value;
    } else if (f.kind === "boolString") {
      const sel = grp.querySelector(`select[name="${f.key}"]`);
      if (!(sel instanceof HTMLSelectElement)) {
        return null;
      }
      out[f.key] = sel.value;
    } else if (f.kind === "nullableString") {
      const ta = grp.querySelector(`textarea[name="${f.key}"]`);
      const cb = grp.querySelector(".record-modal__null-cb");
      if (!(ta instanceof HTMLTextAreaElement) || !(cb instanceof HTMLInputElement)) {
        return null;
      }
      if (cb.checked) {
        out[f.key] = null;
      } else if (f.pipeAsNewline) {
        out[f.key] = linesToPipeSeparated(ta.value);
      } else {
        out[f.key] = ta.value;
      }
    } else if (f.kind === "jsonNull") {
      const ta = grp.querySelector("textarea");
      const cb = grp.querySelector(".record-modal__null-cb");
      if (!(ta instanceof HTMLTextAreaElement) || !(cb instanceof HTMLInputElement)) {
        return null;
      }
      if (cb.checked) {
        out[f.key] = null;
      } else {
        const raw = ta.value.trim();
        if (!raw) {
          alert(`Champ ${f.key} : saisir du JSON valide ou cocher « valeur nulle ».`);
          return null;
        }
        try {
          out[f.key] = JSON.parse(raw);
        } catch {
          alert(`Champ ${f.key} : JSON invalide.`);
          return null;
        }
      }
    }
  }
  return out;
}
