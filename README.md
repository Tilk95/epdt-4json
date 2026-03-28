# epdt-4json

Application web (JavaScript modules ES) pour charger, consulter et éditer en mémoire quatre fichiers JSON de configuration (noms strictement définis).

## Lancement en local

Les modules ES nécessitent un **serveur HTTP** (éviter `file://`).

```bash
npx --yes serve .
```

Puis ouvrir l’URL affichée (souvent `http://localhost:3000`). Alternative : `python3 -m http.server 8080` à la racine du dépôt.

## Documentation

Voir `documentation/specifications.md` pour le parcours interface, les structures JSON et les règles de validation (dont GSP : en-têtes séparés par `|`, `gsp_header_envoyer` à `"true"` ou `"false"`).
