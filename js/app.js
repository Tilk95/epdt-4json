/**
 * Point d’entrée : câblage dépôt → ingestion → tuiles → visualisation.
 */

import { createFileStore } from "./metier/file-store.js";
import { ingestFiles } from "./metier/ingest-files.js";
import { EXPECTED_FILES } from "./metier/expected-files.js";
import { initDropZone } from "./ihm/drop-zone.js";
import { renderTileBoard } from "./ihm/tile-board.js";
import { initFileViewer, showFileContent } from "./ihm/file-viewer.js";
import { initRecordModal } from "./ihm/record-modal.js";
import { downloadJsonFile } from "./ihm/export-file.js";
import { initGsaXmlImportModal } from "./ihm/gsa-xml-import-modal.js";

const store = createFileStore();

/** Fichier actuellement affiché dans la modale fichier (pour rafraîchir après mutation). */
let currentViewerFileId = null;

const viewDrop = document.getElementById("view-drop");
const viewTiles = document.getElementById("view-tiles");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const btnBrowseLabel = document.getElementById("btn-browse");
const dropFeedback = document.getElementById("drop-feedback");
const tileGrid = document.getElementById("tile-grid");
const btnBackDrop = document.getElementById("btn-back-drop");
const dialog = document.getElementById("dialog-viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerBody = document.getElementById("viewer-body");
const viewerClose = document.getElementById("viewer-close");
const viewerExport = document.getElementById("viewer-export");
const expectedFilesList = document.getElementById("expected-files-list");
const dialogRecord = document.getElementById("dialog-record");
const recordTitle = document.getElementById("record-title");
const recordBody = document.getElementById("record-body");
const recordFooter = document.getElementById("record-footer");
const recordClose = document.getElementById("record-close");
const dialogGsaXml = document.getElementById("dialog-gsa-xml-import");
const gsaXmlIntro = document.getElementById("gsa-xml-import-intro");
const gsaXmlBody = document.getElementById("gsa-xml-import-body");
const gsaXmlClose = document.getElementById("gsa-xml-import-close");
const gsaXmlCancel = document.getElementById("gsa-xml-import-cancel");
const gsaXmlConfirm = document.getElementById("gsa-xml-import-confirm");

if (
  !viewDrop ||
  !viewTiles ||
  !(dropZone instanceof HTMLElement) ||
  !(fileInput instanceof HTMLInputElement) ||
  !(btnBrowseLabel instanceof HTMLElement) ||
  !(dropFeedback instanceof HTMLElement) ||
  !tileGrid ||
  !(btnBackDrop instanceof HTMLButtonElement) ||
  !(dialog instanceof HTMLDialogElement) ||
  !viewerTitle ||
  !viewerBody ||
  !(viewerClose instanceof HTMLButtonElement) ||
  !(viewerExport instanceof HTMLButtonElement) ||
  !(dialogRecord instanceof HTMLDialogElement) ||
  !recordTitle ||
  !recordBody ||
  !recordFooter ||
  !(recordClose instanceof HTMLButtonElement)
) {
  throw new Error("Structure HTML incomplète pour l’application.");
}

/**
 * Liste des noms de fichiers attendus (source métier : EXPECTED_FILES).
 * @param {HTMLUListElement} ul
 */
function fillExpectedFilesList(ul) {
  ul.replaceChildren();
  for (const f of EXPECTED_FILES) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.className = "expected-files__label";
    label.textContent = `${f.label} — `;
    const code = document.createElement("code");
    code.className = "expected-files__name";
    code.textContent = f.fileName;
    li.append(label, code);
    ul.append(li);
  }
}

if (expectedFilesList instanceof HTMLUListElement) {
  fillExpectedFilesList(expectedFilesList);
}

initFileViewer(dialog, viewerTitle, viewerBody, viewerClose, viewerExport);

/**
 * Télécharge le JSON courant (mémoire) sous le nom d’origine du fichier attendu.
 * @param {string} fileId
 */
function exportFileById(fileId) {
  const def = EXPECTED_FILES.find((f) => f.id === fileId);
  if (!def) {
    return;
  }
  const entry = store.get(def.fileName);
  if (!entry || entry.status !== "loaded") {
    return;
  }
  downloadJsonFile(def.fileName, entry.rawText);
}

function refreshAfterRecordMutation() {
  refreshTiles();
  if (!currentViewerFileId) {
    return;
  }
  const def = EXPECTED_FILES.find((f) => f.id === currentViewerFileId);
  if (!def) {
    return;
  }
  const entry = store.get(def.fileName) ?? { status: "missing" };
  showFileContent(
    currentViewerFileId,
    entry,
    dialog,
    viewerTitle,
    viewerBody,
    viewerOptions,
  );
}

const recordModal = initRecordModal(
  dialogRecord,
  recordTitle,
  recordBody,
  recordFooter,
  recordClose,
  { store, onSuccess: refreshAfterRecordMutation },
);

const viewerOptions = {
  store,
  recordModal,
  exportButton: viewerExport,
  exportFileById,
  onImportGsaXml: undefined,
};

function showView(name) {
  if (name === "drop") {
    viewDrop.hidden = false;
    viewDrop.classList.add("view--active");
    viewTiles.hidden = true;
    viewTiles.classList.remove("view--active");
  } else {
    viewDrop.hidden = true;
    viewDrop.classList.remove("view--active");
    viewTiles.hidden = false;
    viewTiles.classList.add("view--active");
  }
}

showView("drop");

function setFeedback(message, kind) {
  dropFeedback.textContent = message;
  dropFeedback.classList.remove("feedback--ok", "feedback--err");
  if (kind === "ok") {
    dropFeedback.classList.add("feedback--ok");
  } else if (kind === "err") {
    dropFeedback.classList.add("feedback--err");
  }
}

function refreshTiles() {
  const rows = store.listExpectedWithState();
  renderTileBoard(
    tileGrid,
    rows,
    (id) => {
      currentViewerFileId = id;
      const def = EXPECTED_FILES.find((f) => f.id === id);
      if (!def) {
        return;
      }
      const entry = store.get(def.fileName) ?? { status: "missing" };
      showFileContent(id, entry, dialog, viewerTitle, viewerBody, viewerOptions);
    },
    exportFileById,
  );
}

async function handleFiles(fileList) {
  if (!fileList || fileList.length === 0) {
    return;
  }

  try {
    const { loaded, errors } = await ingestFiles(store, fileList);

    const unknown = Array.from(fileList).filter(
      (f) => !EXPECTED_FILES.some((e) => e.fileName === f.name),
    );

    const parts = [];
    if (loaded > 0) {
      parts.push(`${loaded} fichier(s) chargé(s) avec succès.`);
    }
    if (unknown.length > 0) {
      parts.push(
        `${unknown.length} fichier(s) ignoré(s) (nom non attendu).`,
      );
    }
    if (errors.length > 0) {
      parts.push(`Erreurs : ${errors.join(" ")}`);
    }

    const hasIssue = errors.length > 0;
    const hasOk =
      loaded > 0 ||
      store.listExpectedWithState().some((r) => r.entry.status === "loaded");

    setFeedback(
      parts.join(" ") || "Aucun fichier attendu détecté.",
      hasIssue ? "err" : hasOk ? "ok" : "",
    );

    refreshTiles();
    showView("tiles");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(err);
    setFeedback(`Erreur lors du chargement : ${msg}`, "err");
  }
}

initDropZone({
  zone: dropZone,
  input: fileInput,
  browseButton: null,
  onFiles: handleFiles,
});

/** Import XML GSA : après le dépôt pour ne jamais bloquer Parcourir. */
const gsaDef = EXPECTED_FILES.find((f) => f.id === "gsa");
if (
  gsaDef &&
  dialogGsaXml instanceof HTMLDialogElement &&
  gsaXmlIntro &&
  gsaXmlBody &&
  gsaXmlClose instanceof HTMLButtonElement &&
  gsaXmlCancel instanceof HTMLButtonElement &&
  gsaXmlConfirm instanceof HTMLButtonElement
) {
  try {
    const gsaXmlImport = initGsaXmlImportModal({
      dialog: dialogGsaXml,
      introEl: gsaXmlIntro,
      bodyEl: gsaXmlBody,
      btnClose: gsaXmlClose,
      btnCancel: gsaXmlCancel,
      btnConfirm: gsaXmlConfirm,
      store,
      fileName: gsaDef.fileName,
      fileId: "gsa",
      onImported: refreshAfterRecordMutation,
    });
    viewerOptions.onImportGsaXml = () => {
      gsaXmlImport.openFilePicker();
    };
  } catch (err) {
    console.error("Import XML services annuels indisponible :", err);
  }
}

btnBackDrop.addEventListener("click", () => {
  showView("drop");
});

refreshTiles();
