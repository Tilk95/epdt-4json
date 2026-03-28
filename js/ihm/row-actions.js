/**
 * Colonne « A. » : boutons d’action par ligne (icônes SVG accessibles).
 */

/**
 * @param {() => void} onVoir
 * @param {() => void} onAjouter
 * @param {() => void} onSupprimer
 * @param {() => void} onModifier
 */
export function createActionsCell(onVoir, onAjouter, onSupprimer, onModifier) {
  const td = document.createElement("td");
  td.className = "data-table__actions";

  const nav = document.createElement("div");
  nav.className = "row-actions";

  const specs = [
    { label: "Voir", action: onVoir, html: iconVoir },
    { label: "Ajouter", action: onAjouter, html: iconPlus },
    { label: "Supprimer", action: onSupprimer, html: iconTrash },
    { label: "Modifier", action: onModifier, html: iconPencil },
  ];

  for (const s of specs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "row-actions__btn";
    btn.setAttribute("aria-label", s.label);
    btn.title = s.label;
    btn.innerHTML = s.html;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      s.action();
    });
    nav.append(btn);
  }

  td.append(nav);
  return td;
}

const iconVoir = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;

const iconPlus = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;

const iconTrash = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

const iconPencil = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
