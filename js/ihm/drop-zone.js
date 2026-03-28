/**
 * IHM : zone de glisser-déposer et sélection de fichiers.
 * @param {object} options
 * @param {HTMLElement} options.zone
 * @param {HTMLInputElement} options.input
 * @param {HTMLElement | null} options.browseButton Bouton « Parcourir » (optionnel si &lt;label for&gt;).
 * @param {(files: File[] | FileList) => void | Promise<void>} options.onFiles
 */
export function initDropZone({ zone, input, browseButton, onFiles }) {
  /**
   * Copie stable des fichiers + appel traitement ; vide le champ seulement après fin (y compris async).
   * Sur certains navigateurs, `input.files` n’est pas fiable dans le même tour que `change` : on diffère d’un tick.
   */
  function scheduleProcessInputFiles() {
    const run = async () => {
      const raw = input.files;
      if (!raw || raw.length === 0) {
        return;
      }
      const snapshot = Array.from(raw);
      try {
        await Promise.resolve(onFiles(snapshot));
      } catch (err) {
        console.error("Traitement des fichiers sélectionnés :", err);
      } finally {
        input.value = "";
      }
    };

    setTimeout(() => {
      void run();
    }, 0);
  }

  zone.addEventListener("click", () => {
    input.click();
  });

  zone.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      input.click();
    }
  });

  input.addEventListener("change", () => {
    scheduleProcessInputFiles();
  });

  if (browseButton) {
    browseButton.addEventListener("click", (e) => {
      e.stopPropagation();
      input.click();
    });
  }

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    zone.classList.add("drop-zone--dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("drop-zone--dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("drop-zone--dragover");
    const dt = e.dataTransfer?.files;
    if (!dt?.length) {
      return;
    }
    const snapshot = Array.from(dt);
    void Promise.resolve(onFiles(snapshot)).catch((err) => {
      console.error("Traitement glisser-déposer :", err);
    });
  });
}
