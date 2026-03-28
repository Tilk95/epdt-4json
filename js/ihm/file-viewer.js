/**
 * IHM : visualisation dans une modale (onglets vue structurée / contenu brut).
 */

import { EXPECTED_FILES } from "../metier/expected-files.js";
import { buildStructuredView } from "./structured-views.js";
import { isEntryModified } from "../metier/file-entry-utils.js";

/**
 * @param {HTMLDialogElement} dialog
 * @param {HTMLElement} titleEl
 * @param {HTMLElement} bodyEl
 * @param {HTMLButtonElement} closeBtn
 * @param {HTMLButtonElement | null} [exportBtn]
 */
export function initFileViewer(dialog, titleEl, bodyEl, closeBtn, exportBtn) {
  function close() {
    dialog.close();
    bodyEl.replaceChildren();
    if (exportBtn instanceof HTMLButtonElement) {
      exportBtn.hidden = true;
      exportBtn.onclick = null;
    }
  }

  closeBtn.addEventListener("click", close);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
}

/**
 * @typedef {object} ShowFileContentOptions
 * @property {ReturnType<import("../metier/file-store.js").createFileStore>} [store]
 * @property {{ open: (p: object) => void }} [recordModal]
 * @property {HTMLButtonElement} [exportButton]
 * @property {(fileId: string) => void} [exportFileById]
 * @property {() => void} [onImportGsaXml] Bouton import XML (services annuels).
 */

/**
 * @param {string} fileId
 * @param {import("../metier/file-store.js").FileEntry} entry
 * @param {HTMLDialogElement} dialog
 * @param {HTMLElement} titleEl
 * @param {HTMLElement} bodyEl
 * @param {ShowFileContentOptions} [options]
 */
export function showFileContent(fileId, entry, dialog, titleEl, bodyEl, options) {
  const meta = EXPECTED_FILES.find((f) => f.id === fileId);
  titleEl.textContent = meta ? `${meta.label} — ${meta.fileName}` : fileId;
  bodyEl.replaceChildren();

  const expBtn = options?.exportButton;
  function syncExportButton() {
    if (!(expBtn instanceof HTMLButtonElement)) {
      return;
    }
    const can =
      entry.status === "loaded" &&
      isEntryModified(entry) &&
      typeof options?.exportFileById === "function";
    expBtn.hidden = !can;
    expBtn.onclick = can
      ? () => {
          options.exportFileById(fileId);
        }
      : null;
  }

  if (entry.status === "missing") {
    if (expBtn instanceof HTMLButtonElement) {
      expBtn.hidden = true;
      expBtn.onclick = null;
    }
    const p = document.createElement("p");
    p.className = "viewer-msg";
    p.textContent = "Ce fichier n’a pas été fourni.";
    bodyEl.append(p);
    if (
      fileId === "gsa" &&
      typeof options?.onImportGsaXml === "function"
    ) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary viewer-msg__action";
      btn.textContent = "Importer depuis un fichier XML…";
      btn.addEventListener("click", () => options.onImportGsaXml());
      bodyEl.append(btn);
    }
    openViewer(dialog, bodyEl);
    return;
  }

  if (entry.status === "error") {
    if (expBtn instanceof HTMLButtonElement) {
      expBtn.hidden = true;
      expBtn.onclick = null;
    }
    const p = document.createElement("p");
    p.className = "viewer-msg viewer-msg--error";
    p.textContent = entry.message;
    bodyEl.append(p);
    openViewer(dialog, bodyEl);
    return;
  }

  let ctx;
  if (options?.store && options?.recordModal && meta) {
    const fileName = meta.fileName;
    const rm = options.recordModal;
    ctx = {
      fileId,
      fileName,
      onRowAction: (action, rowIndex, row) => {
        rm.open({
          action,
          fileId,
          fileName,
          rowIndex,
          row,
        });
      },
    };
    if (
      fileId === "gsa" &&
      typeof options.onImportGsaXml === "function"
    ) {
      ctx.onImportGsaXml = options.onImportGsaXml;
    }
  }

  const structured = buildStructuredView(fileId, entry.data, ctx);

  const rawText =
    typeof entry.rawText === "string" && entry.rawText.length > 0
      ? entry.rawText
      : JSON.stringify(entry.data, null, 2);

  bodyEl.append(buildViewerTabs(structured, rawText));

  syncExportButton();

  openViewer(dialog, bodyEl);
}

/**
 * Ouvre la modale et cible la zone scroll pour le pavé / la molette (WebKit).
 * @param {HTMLDialogElement} dialog
 * @param {HTMLElement} scrollEl
 */
function openViewer(dialog, scrollEl) {
  dialog.showModal();
  requestAnimationFrame(() => {
    scrollEl.focus({ preventScroll: true });
  });
}

/**
 * Onglets : vue structurée (tableau ou JSON formaté) et texte brut du fichier.
 * @param {HTMLElement} structuredRoot
 * @param {string} rawText
 */
function buildViewerTabs(structuredRoot, rawText) {
  const root = document.createElement("div");
  root.className = "viewer-tabs";

  const tablist = document.createElement("div");
  tablist.className = "viewer-tabs__list";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Mode d’affichage");

  const btnStruct = document.createElement("button");
  btnStruct.type = "button";
  btnStruct.className = "viewer-tabs__tab viewer-tabs__tab--active";
  btnStruct.setAttribute("role", "tab");
  btnStruct.setAttribute("aria-selected", "true");
  btnStruct.textContent = "Vue structurée";

  const btnRaw = document.createElement("button");
  btnRaw.type = "button";
  btnRaw.className = "viewer-tabs__tab";
  btnRaw.setAttribute("role", "tab");
  btnRaw.setAttribute("aria-selected", "false");
  btnRaw.textContent = "Contenu brut";

  const panelStruct = document.createElement("div");
  panelStruct.className = "viewer-tabs__panel";
  panelStruct.setAttribute("role", "tabpanel");
  panelStruct.append(structuredRoot);

  const panelRaw = document.createElement("div");
  panelRaw.className = "viewer-tabs__panel";
  panelRaw.setAttribute("role", "tabpanel");
  panelRaw.hidden = true;

  const pre = document.createElement("pre");
  pre.className = "json-pre viewer-raw";
  pre.textContent = rawText;
  panelRaw.append(pre);

  function activateStructured(isStructured) {
    panelStruct.hidden = !isStructured;
    panelRaw.hidden = isStructured;
    btnStruct.classList.toggle("viewer-tabs__tab--active", isStructured);
    btnRaw.classList.toggle("viewer-tabs__tab--active", !isStructured);
    btnStruct.setAttribute("aria-selected", String(isStructured));
    btnRaw.setAttribute("aria-selected", String(!isStructured));
  }

  btnStruct.addEventListener("click", () => activateStructured(true));
  btnRaw.addEventListener("click", () => activateStructured(false));

  tablist.append(btnStruct, btnRaw);
  root.append(tablist, panelStruct, panelRaw);
  return root;
}
