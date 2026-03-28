/**
 * Vues structurées en tableaux pour chaque type de fichier (onglet « Vue structurée »).
 * Même logique : tableau + barre d’options pour masquer/afficher les champs sensibles.
 */

import { createActionsCell } from "./row-actions.js";

/**
 * @typedef {object} StructuredViewContext
 * @property {string} fileId
 * @property {string} fileName
 * @property {(action: 'voir' | 'ajouter' | 'supprimer' | 'modifier', rowIndex: number, row: object) => void} onRowAction
 * @property {() => void} [onImportGsaXml] Import XML services annuels (GSA uniquement).
 */

/**
 * @param {string} fileId
 * @param {unknown} data
 * @param {StructuredViewContext | undefined} ctx
 * @returns {HTMLElement}
 */
export function buildStructuredView(fileId, data, ctx) {
  const rows = /** @type {object[]} */ (Array.isArray(data) ? data : []);
  switch (fileId) {
    case "gde":
      return buildGdeTableView(rows, ctx);
    case "gsa":
      return buildGsaTableView(rows, ctx);
    case "gsp":
      return buildGspTableView(rows, ctx);
    case "par":
      return buildParTableView(rows, ctx);
    default:
      return buildFallbackJsonView(data);
  }
}

/**
 * @param {StructuredViewContext | undefined} ctx
 * @param {number} rowIndex
 * @param {object} row
 */
function actionsCell(ctx, rowIndex, row) {
  if (!ctx) {
    throw new Error("actionsCell sans contexte");
  }
  return createActionsCell(
    () => ctx.onRowAction("voir", rowIndex, row),
    () => ctx.onRowAction("ajouter", rowIndex, row),
    () => ctx.onRowAction("supprimer", rowIndex, row),
    () => ctx.onRowAction("modifier", rowIndex, row),
  );
}

/**
 * @param {unknown} v
 */
function displayScalar(v) {
  if (v === null || v === undefined) {
    return "—";
  }
  return String(v);
}

/**
 * @param {string} fullValue
 */
function createMaskedSpan(fullValue) {
  const span = document.createElement("span");
  span.className = "data-secret";
  span.dataset.full = fullValue;
  span.textContent = "••••••••";
  return span;
}

/**
 * Affichage tableau GSP : chaque segment d’en-tête séparé par | sur sa propre ligne.
 * @param {string} raw
 */
function gspHeadersPipeToNewlines(raw) {
  return raw.split("|").join("\n");
}

/**
 * @param {HTMLElement} tableWrap
 * @param {HTMLInputElement} checkbox
 * @param {string} [selector]
 * @param {{ formatReveal?: (full: string) => string }} [opts]
 */
function wireSecretToggle(tableWrap, checkbox, selector = ".data-secret", opts) {
  const formatReveal =
    opts && typeof opts.formatReveal === "function"
      ? opts.formatReveal
      : (/** @type {string} */ full) => full;
  checkbox.addEventListener("change", () => {
    const show = checkbox.checked;
    tableWrap.querySelectorAll(selector).forEach((el) => {
      const s = /** @type {HTMLElement} */ (el);
      const full = s.dataset.full ?? "";
      s.textContent = show ? formatReveal(full) : "••••••••";
    });
  });
}

/**
 * @param {object[]} rows
 * @param {StructuredViewContext | undefined} ctx
 */
function buildGdeTableView(rows, ctx) {
  const showActions = Boolean(ctx);
  const wrap = document.createElement("div");

  const toolbar = document.createElement("div");
  toolbar.className = "data-toolbar";
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "toggle-secrets-gde";
  label.append(cb, document.createTextNode(" Afficher les mots de passe"));
  toolbar.append(label);

  const tableWrap = document.createElement("div");
  tableWrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  thead.innerHTML = showActions
    ? `<tr><th class="data-table__col-a" scope="col">A.</th><th>Environnement</th><th>Serveur</th><th>Utilisateur</th><th>Mot de passe</th></tr>`
    : "<tr><th>Environnement</th><th>Serveur</th><th>Utilisateur</th><th>Mot de passe</th></tr>";
  const tbody = document.createElement("tbody");

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (showActions && ctx) {
      tr.append(actionsCell(ctx, rowIndex, row));
    }

    const env = document.createElement("td");
    env.textContent = displayScalar(row.gde_environnement);
    const srv = document.createElement("td");
    srv.textContent = displayScalar(row.gde_serveur);
    const user = document.createElement("td");
    user.textContent =
      row.gde_svc_user === null || row.gde_svc_user === undefined
        ? "—"
        : String(row.gde_svc_user);

    const pwdCell = document.createElement("td");
    const pwd = row.gde_svc_password;
    if (pwd === null || pwd === undefined) {
      pwdCell.textContent = "—";
    } else {
      pwdCell.append(createMaskedSpan(String(pwd)));
    }

    tr.append(env, srv, user, pwdCell);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  wireSecretToggle(tableWrap, cb);

  wrap.append(toolbar, tableWrap);
  return wrap;
}

/**
 * @param {unknown} v
 */
function formatGsaListe(v) {
  if (v === null || v === undefined) {
    return "—";
  }
  return JSON.stringify(v);
}

/**
 * @param {object[]} rows
 * @param {StructuredViewContext | undefined} ctx
 */
function buildGsaTableView(rows, ctx) {
  const showActions = Boolean(ctx);
  const wrap = document.createElement("div");

  const toolbar = document.createElement("div");
  toolbar.className = "data-toolbar";
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "toggle-secrets-gsa";
  label.append(cb, document.createTextNode(" Afficher l’identifiant basic (gsa_id_basic)"));
  toolbar.append(label);

  if (ctx?.onImportGsaXml) {
    const btnXml = document.createElement("button");
    btnXml.type = "button";
    btnXml.className = "btn btn--secondary";
    btnXml.textContent = "Importer XML…";
    btnXml.addEventListener("click", () => {
      ctx.onImportGsaXml();
    });
    toolbar.append(btnXml);
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  thead.innerHTML = showActions
    ? `<tr>
    <th class="data-table__col-a" scope="col">A.</th>
    <th>Libellé SA</th>
    <th>Début</th>
    <th>Fin</th>
    <th>Publication</th>
    <th>DGA</th>
    <th>Actif</th>
    <th>Construction</th>
    <th>Événements SA</th>
    <th>Périodes circu</th>
    <th>ID basic</th>
    <th>Plancher</th>
  </tr>`
    : `<tr>
    <th>Libellé SA</th>
    <th>Début</th>
    <th>Fin</th>
    <th>Publication</th>
    <th>DGA</th>
    <th>Actif</th>
    <th>Construction</th>
    <th>Événements SA</th>
    <th>Périodes circu</th>
    <th>ID basic</th>
    <th>Plancher</th>
  </tr>`;
  const tbody = document.createElement("tbody");

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (showActions && ctx) {
      tr.append(actionsCell(ctx, rowIndex, row));
    }

    const tLib = document.createElement("td");
    tLib.textContent = displayScalar(row.gsa_libelle_sa);
    const tDeb = document.createElement("td");
    tDeb.textContent = displayScalar(row.gsa_date_debut);
    const tFin = document.createElement("td");
    tFin.textContent = displayScalar(row.gsa_date_fin);
    const tPub = document.createElement("td");
    tPub.textContent = displayScalar(row.gsa_date_publication);
    const tDga = document.createElement("td");
    tDga.textContent = displayScalar(row.gsa_date_dga);
    const tAct = document.createElement("td");
    tAct.textContent = displayScalar(row.gsa_ind_actif);
    const tCons = document.createElement("td");
    tCons.textContent = displayScalar(row.gsa_date_construction);

    const tEv = document.createElement("td");
    tEv.className = "data-table__cell--json";
    tEv.textContent = formatGsaListe(row.gsa_liste_evenement_du_sa);
    const tPer = document.createElement("td");
    tPer.className = "data-table__cell--json";
    tPer.textContent = formatGsaListe(row.gsa_liste_periodes_de_circu);

    const tId = document.createElement("td");
    const idVal = row.gsa_id_basic;
    if (idVal === null || idVal === undefined) {
      tId.textContent = "—";
    } else {
      tId.append(createMaskedSpan(String(idVal)));
    }

    const tPla = document.createElement("td");
    tPla.textContent = displayScalar(row.gsa_date_plancher);

    tr.append(
      tLib,
      tDeb,
      tFin,
      tPub,
      tDga,
      tAct,
      tCons,
      tEv,
      tPer,
      tId,
      tPla,
    );
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  wireSecretToggle(tableWrap, cb);

  wrap.append(toolbar, tableWrap);
  return wrap;
}

/**
 * @param {object[]} rows
 * @param {StructuredViewContext | undefined} ctx
 */
function buildGspTableView(rows, ctx) {
  const showActions = Boolean(ctx);
  const wrap = document.createElement("div");

  const toolbar = document.createElement("div");
  toolbar.className = "data-toolbar";
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = "toggle-secrets-gsp";
  label.append(cb, document.createTextNode(" Afficher le contenu des en-têtes (secrets possibles)"));
  toolbar.append(label);
  const hint = document.createElement("p");
  hint.className = "data-toolbar__hint";
  hint.textContent =
    "En-têtes : plusieurs blocs « Nom: valeur » séparés par |.";
  toolbar.append(hint);

  const tableWrap = document.createElement("div");
  tableWrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  thead.innerHTML = showActions
    ? '<tr><th class="data-table__col-a" scope="col">A.</th><th>Service</th><th>URI</th><th>En-têtes</th><th>Envoyer</th></tr>'
    : "<tr><th>Service</th><th>URI</th><th>En-têtes</th><th>Envoyer</th></tr>";
  const tbody = document.createElement("tbody");

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (showActions && ctx) {
      tr.append(actionsCell(ctx, rowIndex, row));
    }

    const s = document.createElement("td");
    s.textContent = displayScalar(row.gsp_service);
    const u = document.createElement("td");
    u.className = "data-table__cell--uri";
    u.textContent = displayScalar(row.gsp_uri);

    const h = document.createElement("td");
    h.className = "data-table__cell--gsp-headers";
    const hc = row.gsp_header_contenu;
    if (hc === null || hc === undefined) {
      h.textContent = "—";
    } else {
      h.append(createMaskedSpan(String(hc)));
    }

    const e = document.createElement("td");
    e.textContent = displayScalar(row.gsp_header_envoyer);

    tr.append(s, u, h, e);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);
  wireSecretToggle(tableWrap, cb, ".data-secret", {
    formatReveal: gspHeadersPipeToNewlines,
  });

  wrap.append(toolbar, tableWrap);
  return wrap;
}

/**
 * @param {object[]} rows
 * @param {StructuredViewContext | undefined} ctx
 */
function buildParTableView(rows, ctx) {
  const showActions = Boolean(ctx);
  const wrap = document.createElement("div");

  const tableWrap = document.createElement("div");
  tableWrap.className = "data-table-wrap";

  const table = document.createElement("table");
  table.className = "data-table";
  const thead = document.createElement("thead");
  thead.innerHTML = showActions
    ? '<tr><th class="data-table__col-a" scope="col">A.</th><th>Code</th><th>Valeur</th><th>Description</th></tr>'
    : "<tr><th>Code</th><th>Valeur</th><th>Description</th></tr>";
  const tbody = document.createElement("tbody");

  rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");
    if (showActions && ctx) {
      tr.append(actionsCell(ctx, rowIndex, row));
    }

    const c = document.createElement("td");
    c.textContent = displayScalar(row.par_code);
    const v = document.createElement("td");
    v.className = "data-table__cell--code";
    v.textContent = displayScalar(row.par_valeur);
    const d = document.createElement("td");
    d.textContent = displayScalar(row.par_description);
    tr.append(c, v, d);
    tbody.append(tr);
  });

  table.append(thead, tbody);
  tableWrap.append(table);

  wrap.append(tableWrap);
  return wrap;
}

/**
 * @param {unknown} data
 */
function buildFallbackJsonView(data) {
  const pre = document.createElement("pre");
  pre.className = "json-pre";
  pre.textContent = JSON.stringify(data, null, 2);
  return pre;
}
