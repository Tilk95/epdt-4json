# Spécifications — epdt-4json

## Objectif

Application web permettant de **gérer quatre fichiers JSON** (chargement, consultation, évolutions ultérieures : édition, export), avec une entrée utilisateur par **glisser-déposer** des fichiers dans l’interface.

## Technique

- **JavaScript vanilla** (pas de framework imposé), modules **ES** (`import` / `export`).
- Découpage cible : **IHM** (pages, événements) / **métier** (validation, transformation des données) / **présentation** (CSS dédié).
- Lancement en local : servir les fichiers via un **serveur HTTP statique** (ex. `npx serve` ou `python3 -m http.server`) depuis la racine du projet, pour éviter les contraintes du schéma `file://` avec les modules.

## Parcours interface (IHM)

1. **Écran dépôt** : une zone unique permet de déposer les fichiers JSON (glisser-déposer ; sélection fichier possible en complément). Les fichiers reconnus sont associés à l’entrée attendue correspondante **par nom exact** ; les autres sont ignorés ou signalés.
2. **Après traitement** (parsing JSON) : affichage du **tableau de bord à tuiles**.
3. **Tuiles** : **une tuile par fichier attendu** (quatre tuiles). Chaque tuile indique le **libellé métier**, le **nom de fichier**, et un **état** (chargé et valide, erreur de lecture ou JSON invalide, non fourni). Si le contenu en mémoire **diffère** du fichier tel qu’au chargement, un badge **Modifié** apparaît ; un bouton **Exporter** (tuile et en-tête de la modale fichier) n’est **affiché que dans ce cas**, pour télécharger le JSON courant sous le **nom de fichier attendu**.
4. **Clic sur une tuile** : ouverture d’une **vue détail** en superposition (modale ou panneau) avec **deux modes** via onglets : **vue structurée** (tableau) et **contenu brut** (texte exact du fichier chargé). Pour chaque fichier attendu, la vue structurée est un **tableau** avec en-têtes métier ; les champs sensibles sont **masqués** par défaut avec une case à cocher pour les révéler (mots de passe GDE, ID basic GSA, en-têtes GSP). Pour **GSP**, une fois les en-têtes révélés, chaque bloc séparé par `|` dans `gsp_header_contenu` s’affiche sur **une ligne distincte** dans la colonne. Le fichier paramètres (PAR) est affiché en tableau sans masquage particulier.
5. **Retour** : fermeture de la vue détail pour revenir au mur de tuiles ; action prévue pour **revenir au dépôt** afin de charger d’autres fichiers (sans recharger la page).

## Arborescence applicative (cible)

| Emplacement | Rôle |
|-------------|------|
| `index.html` | Structure des écrans (dépôt, tuiles), conteneur de la modale de visualisation. |
| `css/app.css` | Mise en forme : zone de dépôt, grille de tuiles, modale, tableau GDE. |
| `js/app.js` | Point d’entrée : câblage des modules IHM et état chargé. |
| `js/metier/` | Fichiers attendus, parsing, validation par type (ex. GDE). |
| `js/ihm/` | Dépôt, rendu des tuiles, modale ; `structured-views.js` : tableaux et masquage pour les quatre types. |

## Fichiers attendus

Les quatre fichiers doivent correspondre en **nom** et en **structure** aux exemples du répertoire `data/` :

| Fichier | Rôle métier |
|---------|-------------|
| `tdel_gde_gest_environnements.json` | Référentiel des environnements et paramètres de connexion (serveur, compte service). |
| `tdelGsaGestServicesAnnuels.json` | Référentiel des **services annuels** (SA) : périodes, dates, identifiant, listes optionnelles. |
| `tdelGspGestSvcApplicatifs.json` | Référentiel des **services applicatifs** exposés (URI, en-têtes HTTP). |
| `tdelParParametre.json` | Liste de **paramètres** nommés (code, valeur, description). |

### Écran initial

- Voir **Parcours interface** : dépôt, puis tuiles, puis visualisation au clic. La validation des noms (correspondance stricte au tableau ci-dessous) et le parsing JSON s’appliquent au moment du dépôt.

---

## 1. `tdel_gde_gest_environnements.json`

### Structure

- **Racine** : tableau (`array`).
- **Éléments** : objets homogènes.

### Propriétés par élément

| Propriété | Type | Description |
|-----------|------|-------------|
| `gde_environnement` | string | Nom de l’environnement ou du service logique (ex. `PROD`, `PUBLICATION`, préfixes `Service…`). |
| `gde_serveur` | string | Hôte ou valeur conventionnelle (ex. adresse IP, ou valeur comme `"1"` selon le cas métier). |
| `gde_svc_user` | string \| null | Identifiant du compte service ; peut être `null`. |
| `gde_svc_password` | string \| null | Mot de passe associé ; peut être `null`. |

### Remarques

- Données **sensibles** : l’interface ne doit pas exposer les secrets de façon imprudente (masquage, pas de journalisation en clair).
- Cohérence des entrées : certaines lignes ont user/password à `null` ; l’application doit accepter ces cas.

---

## 2. `tdelGsaGestServicesAnnuels.json`

### Structure

- **Racine** : tableau.
- **Éléments** : un objet par **service annuel (SA)**.

### Propriétés par élément

| Propriété | Type | Description |
|-----------|------|-------------|
| `gsa_libelle_sa` | string | Libellé du SA (ex. `SA2025`). |
| `gsa_date_debut` | string | Date début (format date type `YYYY-MM-DD` dans les exemples). |
| `gsa_date_fin` | string | Date fin. |
| `gsa_date_publication` | string | Date de publication. |
| `gsa_date_dga` | string | Date DGA. |
| `gsa_ind_actif` | string | Indicateur d’activité (ex. `"1"` dans les exemples). |
| `gsa_date_construction` | string | Date de construction. |
| `gsa_liste_evenement_du_sa` | null \| (type à préciser si renseigné) | Dans les exemples : toujours `null`. |
| `gsa_liste_periodes_de_circu` | null \| (type à préciser si renseigné) | Dans les exemples : toujours `null`. |
| `gsa_id_basic` | string | Identifiant long (chaîne hexadécimale dans les exemples). |
| `gsa_date_plancher` | string | Date « plancher ». |

### Remarques

- Les dates sont stockées en **chaînes** ; le métier peut les valider ou les normaliser selon les besoins d’édition.

---

## 3. `tdelGspGestSvcApplicatifs.json`

### Structure

- **Racine** : tableau.
- **Éléments** : un objet par **service applicatif**.

### Propriétés par élément

| Propriété | Type | Description |
|-----------|------|-------------|
| `gsp_service` | string | Nom du service (ex. `ServiceCirculation`, `ServiceECI`, …). |
| `gsp_uri` | string | URL complète du point d’accès (schéma `http` ou `https`). |
| `gsp_header_contenu` | string \| null | Contenu des en-têtes HTTP à utiliser (peut inclure clés API) ; `null` si aucun. |
| `gsp_header_envoyer` | string | Indicateur d’envoi des en-têtes : uniquement les littéraux **`"true"`** ou **`"false"`** (validation stricte). |

### Format des en-têtes (`gsp_header_contenu`)

- Plusieurs en-têtes dans la **même** valeur sont séparés par le caractère **`|`** (pipe). Chaque bloc est de la forme `Nom: valeur` (deux-points après le nom, espaces autorisés).
- Exemple : `Accept-version: 2.0.16|x-api-key: e9abb96e-1d01-4248-b10f-34d5cdac46a1` (deux en-têtes séparés par `|`).
- **Saisie (modale ajouter / modifier)** : chaque segment séparé par `|` est affiché sur **une ligne** du champ texte ; à l’**enregistrement**, chaque **ligne non vide** (après suppression des espaces en début/fin) redevient un segment, les segments étant à nouveau joints par `|` (les lignes vides sont ignorées).
- **Consultation (modale « Voir »)** : pour `gsp_header_contenu`, les segments séparés par `|` sont affichés sur des **lignes distinctes** (même logique que dans le tableau une fois les en-têtes révélés).

### Remarques

- Données **sensibles** : `gsp_header_contenu` peut contenir des secrets ; traitement comme pour les mots de passe (affichage / copie avec précaution).
- `gsp_header_envoyer` est validé strictement : chaîne `"true"` ou `"false"` uniquement.

---

## 4. `tdelParParametre.json`

### Structure

- **Racine** : tableau.
- **Éléments** : objets décrivant un **paramètre** applicatif.

### Propriétés par élément

| Propriété | Type | Description |
|-----------|------|-------------|
| `par_code` | string | Code unique du paramètre (ex. `DATE_MRDT`, `NB_ESSAI_APPEL_SERVICE`). |
| `par_valeur` | string | Valeur courante (peut être une date ISO 8601, un nombre en texte, etc.). |
| `par_description` | string | Libellé ou description lisible pour l’humain. |

### Remarques

- `par_valeur` est toujours une **chaîne** dans les exemples ; la sémantique (date, entier, …) dépend du `par_code`.

---

## Données sensibles et dépôt

- Les fichiers d’exemple peuvent contenir des identifiants réels. Pour le versioning : préférer des **jeux anonymisés** ou exclure `data/` des commits si nécessaire.

## Évolutions possibles (hors périmètre immédiat)

- Édition des champs, export JSON, schémas JSON de validation, tests automatisés sur la structure.



### Mapping `tdelGsaGestServicesAnnuels.json` ← fichier XML (`VueSA`)

**Dates depuis le XML** : l’instant ISO 8601 de chaque balise est converti en **date civile (jour calendaire) dans le fuseau `Europe/Paris`**, puis formatée en **`AAAA-MM-JJ`**. Ne pas utiliser la date UTC seule : pour un même instant, le jour peut différer de UTC (ex. fin de journée UTC = jour suivant à Paris).

| Champ JSON | Source XML |
|------------|------------|
| `gsa_libelle_sa` | `VueSA.libelle` |
| `gsa_date_debut` | `VueSA.dateDebut` → date à Paris, `AAAA-MM-JJ` |
| `gsa_date_fin` | `VueSA.dateFin` → date à Paris, `AAAA-MM-JJ` |
| `gsa_date_publication` | `VueSA.dateDebutPublicationProjetHoraire` → date à Paris, `AAAA-MM-JJ` ; si la balise est **absente**, **`null`** |
| `gsa_date_dga` | Année = (4 derniers caractères de `VueSA.libelle`) − 1 → `AAAA-07-01` |
| `gsa_ind_actif` | `"1"` |
| `gsa_date_construction` | Même année dérivée → `AAAA-01-01` |
| `gsa_liste_evenement_du_sa` | `null` |
| `gsa_liste_periodes_de_circu` | `null` |
| `gsa_id_basic` | Voir **RG01** ci-dessous (`VueSA.id`) |
| `gsa_date_plancher` | Même année dérivée → `AAAA-03-01` |

#### RG01 — `gsa_id_basic` à partir de `VueSA.id` (UUID)

À partir de l’exemple :

- source = `a8ec0df7-602e-4d7b-8923-3c11acaa424c`
- destination = `4138454330444637363032453444374238393233334331314143414134323443`

Étapes :

1. Mettre la chaîne en **majuscules**.
2. Supprimer les **tirets** `-`.
3. Pour chaque caractère restant : prendre le **code ASCII**, l’écrire en **hexadécimal** (deux caractères par code), concaténer pour former `gsa_id_basic`.
