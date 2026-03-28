/**
 * Modale : choix des VueSA issus d’un fichier XML à fusionner dans le JSON GSA.
 */

import {
  parseVueSaXml,
  buildGsaRowFromVueSa,
  existingGsaLibelleKeysFromStoreEntry,
  filterVueSaServicesNotYetInGsa,
  normalizeGsaLibelleSaKey,
} from "../metier/gsa-xml-import.js";
import { appendRows } from "../metier/mutate-file-data.js";

/**
 * @param {object} opts
 * @param {HTMLDialogElement} opts.dialog
 * @param {HTMLElement} opts.introEl
 * @param {HTMLElement} opts.bodyEl
 * @param {HTMLButtonElement} opts.btnClose
 * @param {HTMLButtonElement} opts.btnCancel
 * @param {HTMLButtonElement} opts.btnConfirm
 * @param {ReturnType<import("../metier/file-store.js").createFileStore>} opts.store
 * @param {string} opts.fileName
 * @param {string} opts.fileId
 * @param {() => void} opts.onImported
 */
export function initGsaXmlImportModal(opts) {
  const {
    dialog,
    introEl,
    bodyEl,
    btnClose,
    btnCancel,
    btnConfirm,
    store,
    fileName,
    fileId,
    onImported,
  } = opts;

  /** @type {object[] | null} */
  let pending = null;

  function close() {
    dialog.close();
    bodyEl.replaceChildren();
    introEl.textContent = "";
    pending = null;
  }

  function renderTable(services) {
    bodyEl.replaceChildren();
    const wrap = document.createElement("div");
    wrap.className = "data-table-wrap";

    const toolbar = document.createElement("div");
    toolbar.className = "gsa-xml-import-toolbar";
    const btnSelectAll = document.createElement("button");
    btnSelectAll.type = "button";
    btnSelectAll.className = "btn btn--secondary";
    btnSelectAll.textContent = "Tout sélectionner";
    const btnDeselectAll = document.createElement("button");
    btnDeselectAll.type = "button";
    btnDeselectAll.className = "btn btn--secondary";
    btnDeselectAll.textContent = "Tout désélectionner";
    toolbar.append(btnSelectAll, btnDeselectAll);

    const table = document.createElement("table");
    table.className = "data-table gsa-xml-import-table";

    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    const th0 = document.createElement("th");
    th0.className = "data-table__col-check";
    const checkAll = document.createElement("input");
    checkAll.type = "checkbox";
    checkAll.id = "gsa-xml-check-all";
    checkAll.checked = true;
    checkAll.setAttribute("aria-label", "Cocher ou décocher toutes les lignes");
    th0.append(checkAll);

    const th1 = document.createElement("th");
    th1.textContent = "Libellé";
    const th2 = document.createElement("th");
    th2.textContent = "Début (heure locale Paris)";
    const th3 = document.createElement("th");
    th3.textContent = "Fin (heure locale Paris)";
    hr.append(th0, th1, th2, th3);
    thead.append(hr);

    const tbody = document.createElement("tbody");
    services.forEach((s, idx) => {
      const tr = document.createElement("tr");
      const td0 = document.createElement("td");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.idx = String(idx);
      cb.checked = true;
      cb.setAttribute("aria-label", `Importer ${s.libelle}`);
      td0.append(cb);

      const td1 = document.createElement("td");
      td1.textContent = s.libelle;
      const td2 = document.createElement("td");
      td2.textContent = s.debutParisLabel;
      const td3 = document.createElement("td");
      td3.textContent = s.finParisLabel;
      tr.append(td0, td1, td2, td3);
      tbody.append(tr);
    });

    function rowCheckboxes() {
      return tbody.querySelectorAll('input[type="checkbox"][data-idx]');
    }

    function syncMasterCheckbox() {
      const boxes = rowCheckboxes();
      const n = boxes.length;
      let checked = 0;
      boxes.forEach((el) => {
        if (/** @type {HTMLInputElement} */ (el).checked) {
          checked += 1;
        }
      });
      checkAll.checked = n > 0 && checked === n;
      checkAll.indeterminate = checked > 0 && checked < n;
    }

    function setAllRowsChecked(on) {
      rowCheckboxes().forEach((el) => {
        /** @type {HTMLInputElement} */ (el).checked = on;
      });
      checkAll.checked = on;
      checkAll.indeterminate = false;
    }

    checkAll.addEventListener("change", () => {
      setAllRowsChecked(checkAll.checked);
    });

    btnSelectAll.addEventListener("click", () => {
      setAllRowsChecked(true);
    });
    btnDeselectAll.addEventListener("click", () => {
      setAllRowsChecked(false);
    });

    tbody.querySelectorAll('input[type="checkbox"][data-idx]').forEach((el) => {
      el.addEventListener("change", syncMasterCheckbox);
    });

    table.append(thead, tbody);
    wrap.append(toolbar, table);
    bodyEl.append(wrap);
  }

  btnClose.addEventListener("click", close);
  btnCancel.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  btnConfirm.addEventListener("click", () => {
    if (!pending) {
      return;
    }
    const entryNow = store.get(fileName);
    const keysPresent = existingGsaLibelleKeysFromStoreEntry(entryNow);
    /** @type {object[]} */
    const selected = [];
    for (const el of bodyEl.querySelectorAll(
      'input[type="checkbox"][data-idx]',
    )) {
      const inp = /** @type {HTMLInputElement} */ (el);
      if (!inp.checked) {
        continue;
      }
      const idx = Number(inp.dataset.idx);
      const s = pending[idx];
      if (!s) {
        continue;
      }
      const row = buildGsaRowFromVueSa(s);
      const key = normalizeGsaLibelleSaKey(String(row.gsa_libelle_sa));
      if (keysPresent.has(key)) {
        alert(
          `Le libellé « ${row.gsa_libelle_sa} » est déjà présent dans les services annuels. Import annulé pour éviter les doublons.`,
        );
        return;
      }
      keysPresent.add(key);
      selected.push(row);
    }
    if (selected.length === 0) {
      alert("Cochez au moins un service à importer.");
      return;
    }
    const r = appendRows(store, fileName, fileId, selected);
    if (!r.ok) {
      alert(r.message ?? "Erreur lors de l’import.");
      return;
    }
    close();
    onImported();
  });

  function openFilePicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xml,application/xml,text/xml";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      let text;
      try {
        text = await file.text();
      } catch {
        alert("Impossible de lire le fichier.");
        return;
      }
      const parsed = parseVueSaXml(text);
      if (!parsed.ok) {
        alert(parsed.message);
        return;
      }
      const entry = store.get(fileName);
      const existingKeys = existingGsaLibelleKeysFromStoreEntry(entry);
      const available = filterVueSaServicesNotYetInGsa(
        parsed.services,
        existingKeys,
      );
      const skippedExisting = parsed.services.length - available.length;
      if (available.length === 0) {
        alert(
          skippedExisting > 0
            ? `Aucun service à importer : les ${parsed.services.length} libellé(s) du fichier sont déjà présents dans « Services annuels ».`
            : "Aucun service importable dans ce fichier.",
        );
        return;
      }
      pending = available;
      let intro = `${available.length} service(s) à importer sur ${parsed.services.length} trouvé(s) dans « ${file.name} ».`;
      if (skippedExisting > 0) {
        intro += ` ${skippedExisting} libellé(s) déjà présent(s) dans le JSON ne sont pas listés.`;
      }
      intro += " Cochez ceux à ajouter au fichier.";
      introEl.textContent = intro;
      renderTable(available);
      dialog.showModal();
      requestAnimationFrame(() => {
        bodyEl.focus({ preventScroll: true });
      });
    });
    input.click();
  }

  return { openFilePicker };
}
