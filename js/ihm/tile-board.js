/**
 * IHM : grille de tuiles (un fichier attendu par tuile).
 */

import { isEntryModified } from "../metier/file-entry-utils.js";

/**
 * @param {HTMLElement} container
 * @param {Array<{ id: string, fileName: string, label: string, entry: import("../metier/file-store.js").FileEntry }>} rows
 * @param {(id: string) => void} onSelect
 * @param {(id: string) => void} onExport
 */
export function renderTileBoard(container, rows, onSelect, onExport) {
  container.replaceChildren();

  for (const row of rows) {
    const card = document.createElement("div");
    card.className = "tile-card";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tile";
    btn.dataset.fileId = row.id;

    const title = document.createElement("p");
    title.className = "tile__label";
    title.textContent = row.label;

    const fname = document.createElement("p");
    fname.className = "tile__file";
    fname.textContent = row.fileName;

    const status = document.createElement("span");
    status.className = "tile__status";

    if (row.entry.status === "loaded") {
      status.classList.add("tile__status--loaded");
      status.textContent = "Chargé";
      btn.addEventListener("click", () => onSelect(row.id));
      btn.append(title, fname, status);
      const modified = isEntryModified(row.entry);
      if (modified) {
        const badge = document.createElement("span");
        badge.className = "tile__badge";
        badge.textContent = "Modifié";
        btn.append(badge);

        const exportBtn = document.createElement("button");
        exportBtn.type = "button";
        exportBtn.className = "btn btn--export";
        exportBtn.textContent = "Exporter";
        exportBtn.title = `Télécharger ${row.fileName}`;
        exportBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onExport(row.id);
        });

        const foot = document.createElement("div");
        foot.className = "tile-card__foot";
        foot.append(exportBtn);
        card.append(btn, foot);
      } else {
        card.append(btn);
      }
    } else if (row.entry.status === "error") {
      status.classList.add("tile__status--error");
      status.textContent = "Erreur";
      btn.addEventListener("click", () => onSelect(row.id));
      btn.append(title, fname, status);
      card.append(btn);
    } else {
      status.classList.add("tile__status--missing");
      status.textContent = "Manquant";
      btn.disabled = true;
      btn.append(title, fname, status);
      card.append(btn);
    }

    container.append(card);
  }
}
