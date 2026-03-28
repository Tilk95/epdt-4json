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
  if (fileId === "gsa") {
    return buildGsaViewDl(row);
  }
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
 * kind : string | stringLine | nullableString | boolString | jsonNull | jsonNullLine
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
    { key: "gsa_libelle_sa", label: "Libellé SA", kind: "stringLine" },
    { key: "gsa_date_debut", label: "Date début", kind: "stringLine" },
    { key: "gsa_date_fin", label: "Date fin", kind: "stringLine" },
    { key: "gsa_date_plancher", label: "Date plancher", kind: "stringLine" },
    { key: "gsa_ind_actif", label: "Actif", kind: "stringLine" },
    { key: "gsa_id_basic", label: "ID basic", kind: "stringLine" },
    { key: "gsa_date_publication", label: "Publication", kind: "stringLine" },
    { key: "gsa_date_dga", label: "DGA", kind: "stringLine" },
    { key: "gsa_date_construction", label: "Construction", kind: "stringLine" },
    {
      key: "gsa_liste_periodes_de_circu",
      label: "Liste périodes de circulation",
      kind: "jsonNullLine",
    },
    {
      key: "gsa_liste_evenement_du_sa",
      label: "Liste événements du SA",
      kind: "jsonNullLine",
    },
  ],
  gsp: [
    { key: "gsp_service", label: "Service", kind: "stringLine" },
    { key: "gsp_uri", label: "URI", kind: "string" },
    {
      key: "gsp_header_contenu",
      label: "Entêtes",
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

/** Première ligne du bloc « Données utiles à ODB » (formulaire + vue détail). */
const GSA_ODB_ROW5_KEYS = [
  "gsa_libelle_sa",
  "gsa_date_debut",
  "gsa_date_fin",
  "gsa_date_plancher",
  "gsa_ind_actif",
];

/** Ligne du bloc « Données informatives » : publication, DGA, construction. */
const GSA_INFO_ROW3_KEYS = [
  "gsa_date_publication",
  "gsa_date_dga",
  "gsa_date_construction",
];

/** Même ligne : listes JSON (saisie texte monoligne). */
const GSA_LIST_JSON_ROW_KEYS = [
  "gsa_liste_periodes_de_circu",
  "gsa_liste_evenement_du_sa",
];

/**
 * @param {string} key
 * @returns {FormFieldDef}
 */
function gsaFieldDef(key) {
  const f = FORM_FIELDS.gsa.find((x) => x.key === key);
  if (!f) {
    throw new Error(`Champ GSA inconnu : ${key}`);
  }
  return f;
}

/**
 * @param {string} title
 */
function gsaBlockTitleEl(title) {
  const h = document.createElement("h3");
  h.className = "record-modal__gsa-block-title";
  h.textContent = title;
  return h;
}

/**
 * @param {unknown} v
 */
function formatGsaDetailValue(v) {
  if (v === null || v === undefined) {
    return "null";
  }
  if (typeof v === "object") {
    return JSON.stringify(v);
  }
  return String(v);
}

/**
 * Détail GSA : blocs ODB / informatives (aligné sur le formulaire).
 * @param {object} row
 */
function buildGsaViewDl(row) {
  const root = document.createElement("div");
  root.className = "record-modal__gsa-detail";

  /**
   * @param {FormFieldDef} f
   * @param {boolean} compact
   */
  function kvBlock(f, compact) {
    const block = document.createElement("div");
    block.className =
      "record-modal__gsa-kv" +
      (compact ? " record-modal__gsa-kv--compact" : "");
    const lbl = document.createElement("div");
    lbl.className = "record-modal__gsa-kv__lbl";
    lbl.textContent = f.label;
    const valEl = document.createElement("div");
    valEl.className =
      "record-modal__gsa-kv__val record-modal__dd--singleline-value";
    valEl.textContent = formatGsaDetailValue(row[f.key]);
    block.append(lbl, valEl);
    return block;
  }

  const blockOdb = document.createElement("div");
  blockOdb.className = "record-modal__gsa-block";
  blockOdb.append(gsaBlockTitleEl("Données utiles à ODB"));

  const row5 = document.createElement("div");
  row5.className = "record-modal__gsa-kv-row record-modal__gsa-kv-row--5";
  for (const key of GSA_ODB_ROW5_KEYS) {
    row5.append(kvBlock(gsaFieldDef(key), true));
  }
  blockOdb.append(row5);
  blockOdb.append(kvBlock(gsaFieldDef("gsa_id_basic"), false));
  root.append(blockOdb);

  const blockInfo = document.createElement("div");
  blockInfo.className = "record-modal__gsa-block";
  blockInfo.append(gsaBlockTitleEl("Données informatives"));

  const row3 = document.createElement("div");
  row3.className = "record-modal__gsa-kv-row record-modal__gsa-kv-row--3";
  for (const key of GSA_INFO_ROW3_KEYS) {
    row3.append(kvBlock(gsaFieldDef(key), true));
  }
  blockInfo.append(row3);

  const rowLists = document.createElement("div");
  rowLists.className = "record-modal__gsa-kv-row record-modal__gsa-kv-row--2";
  for (const key of GSA_LIST_JSON_ROW_KEYS) {
    rowLists.append(kvBlock(gsaFieldDef(key), true));
  }
  blockInfo.append(rowLists);
  root.append(blockInfo);

  return root;
}

/**
 * @param {FormFieldDef} f
 * @param {object} row
 * @param {string} [extraFieldClass]
 */
function createFieldGroup(f, row, extraFieldClass) {
  const grp = document.createElement("div");
  grp.className =
    "record-modal__field" + (extraFieldClass ? ` ${extraFieldClass}` : "");
  grp.dataset.fieldKey = f.key;

  const lab = document.createElement("label");
  lab.className = "record-modal__label-text";
  lab.textContent = f.label;

  const val = row[f.key];
  if (f.kind === "stringLine") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.name = f.key;
    inp.value = val !== undefined && val !== null ? String(val) : "";
    inp.className = "record-modal__input-text";
    inp.autocomplete = "off";
    grp.append(lab, inp);
  } else if (f.kind === "string") {
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
  } else if (f.kind === "jsonNullLine") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.name = f.key;
    inp.className =
      "record-modal__input-text record-modal__input-text--one-line-json";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    if (val === null || val === undefined) {
      inp.value = "";
      inp.disabled = true;
    } else {
      inp.value = JSON.stringify(val);
    }
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "record-modal__null-cb";
    cb.checked = val === null;
    cb.addEventListener("change", () => {
      inp.disabled = cb.checked;
      if (cb.checked) {
        inp.value = "";
      }
    });
    const hint = document.createElement("span");
    hint.className = "record-modal__hint";
    hint.textContent = " Valeur JSON nulle";
    grp.append(lab, inp, cb, hint);
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
  return grp;
}

/**
 * Formulaire GSA : blocs « Données utiles à ODB » / « Données informatives ».
 * @param {object} row
 */
function buildGsaForm(row) {
  const form = document.createElement("div");
  form.className = "record-modal__form";

  const blockOdb = document.createElement("div");
  blockOdb.className = "record-modal__gsa-block";
  blockOdb.append(gsaBlockTitleEl("Données utiles à ODB"));

  const row5 = document.createElement("div");
  row5.className =
    "record-modal__field-row record-modal__field-row--gsa-odb-5";
  for (const key of GSA_ODB_ROW5_KEYS) {
    row5.append(
      createFieldGroup(
        gsaFieldDef(key),
        row,
        "record-modal__field--quad-cell",
      ),
    );
  }
  blockOdb.append(row5);
  blockOdb.append(createFieldGroup(gsaFieldDef("gsa_id_basic"), row));
  form.append(blockOdb);

  const blockInfo = document.createElement("div");
  blockInfo.className = "record-modal__gsa-block";
  blockInfo.append(gsaBlockTitleEl("Données informatives"));

  const row3 = document.createElement("div");
  row3.className =
    "record-modal__field-row record-modal__field-row--gsa-info-3";
  for (const key of GSA_INFO_ROW3_KEYS) {
    row3.append(
      createFieldGroup(
        gsaFieldDef(key),
        row,
        "record-modal__field--quad-cell",
      ),
    );
  }
  blockInfo.append(row3);

  const rowLists = document.createElement("div");
  rowLists.className =
    "record-modal__field-row record-modal__field-row--gsa-lists-2";
  for (const key of GSA_LIST_JSON_ROW_KEYS) {
    rowLists.append(
      createFieldGroup(
        gsaFieldDef(key),
        row,
        "record-modal__field--quad-cell",
      ),
    );
  }
  blockInfo.append(rowLists);
  form.append(blockInfo);

  return form;
}

/**
 * @param {string} fileId
 * @param {object} row
 */
function buildForm(fileId, row) {
  if (fileId === "gsa") {
    return buildGsaForm(row);
  }
  const form = document.createElement("div");
  form.className = "record-modal__form";
  const fields = FORM_FIELDS[fileId];
  if (!fields) {
    form.textContent = "Formulaire non défini pour ce type.";
    return form;
  }
  for (const f of fields) {
    form.append(createFieldGroup(f, row));
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
    if (f.kind === "stringLine") {
      const inp = grp.querySelector(`input[name="${f.key}"]`);
      if (!(inp instanceof HTMLInputElement)) {
        return null;
      }
      out[f.key] = inp.value;
    } else if (f.kind === "string") {
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
    } else if (f.kind === "jsonNullLine") {
      const inp = grp.querySelector(`input[name="${f.key}"]`);
      const cb = grp.querySelector(".record-modal__null-cb");
      if (!(inp instanceof HTMLInputElement) || !(cb instanceof HTMLInputElement)) {
        return null;
      }
      if (cb.checked) {
        out[f.key] = null;
      } else {
        const raw = inp.value.trim();
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
