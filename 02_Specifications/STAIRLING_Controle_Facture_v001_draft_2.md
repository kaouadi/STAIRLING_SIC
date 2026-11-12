# STAIRLING — Contrôle des factures dans l'Event Store

| | |
|---|---|
| Document | Spécification du contrôle des pièces `FACTURE_VENTE`, `AVOIR_VENTE`, `FACTURE_ACHAT`, `AVOIR_ACHAT` |
| Version | v001 draft 2 — 10 novembre 2026. Remplace la v001 initiale (archivée dans `_arch/`). Chemins alignés sur le payload des fiches v001 draft 4 : bloc `invoice` à la structure EN 16931, bloc `stairling` hors norme, enveloppe enrichie (`invoice_key`, `idempotency_key`, `correlation_id`). Nouvelles règles `STAIRLING-IDEMPOTENCE`, `STAIRLING-DEVISE`, BR-O-11, `STAIRLING-MOTIF-EXONERATION` ; `STAIRLING-DOUBLON` fondée sur `invoice_key` ; `STAIRLING-DIRECTION` achat fondée sur `link_method` |
| Auteur | AOUADI Karim |
| Rattachement | `STAIRLING_Event_Payload_FACTURE_VENTE_v001_draft_4.md`, `STAIRLING_Event_Payload_FACTURE_ACHAT_v001_draft_4.md` ; format pivot `OCR/STAIRLING_Format_Facture_OCR_v001_draft_16.docx` ; proposition de mise à jour de l'Event Store, §5.4, §6, §7.3 |
| Norme | EN 16931 (règles BR-CO, BR-S, BR-O) |

## 1. Objet

Toute pièce entre dans l'Event Store au statut `RECU`. Le contrôle décide si elle passe à `VALIDE` (elle produit alors des faits et des écritures) ou à `REJETE` (elle n'en produit aucun). Aucune pièce ne produit d'écriture sans être passée par ce contrôle.

Le contrôle est **automatique**. Une personne n'intervient que sur les pièces rejetées ou signalées (§7).

## 2. Déroulement

```
Pièce reçue (statut RECU)
   │
   ▼
N1 Structure ──KO──► REJETE
   │ OK
   ▼
N2 Arithmétique EN 16931 ──KO──► REJETE
   │ OK
   ▼
N3 Cohérence Stairling ──KO──► REJETE
   │ OK
   ▼
N4 Rapprochement ──manque une donnée──► reste RECU, nouvel essai (§6)
   │            ──écart──► REJETE
   │ OK
   ▼
VALIDE (avec ou sans avertissement)
```

Les niveaux s'exécutent dans l'ordre : inutile de vérifier les totaux d'une pièce mal formée. Au sein d'un niveau, **toutes** les règles sont exécutées, pour que le rapport liste toutes les anomalies d'un coup.

## 3. Gravité d'une règle

| Gravité | Effet si la règle échoue | Exemple |
|---|---|---|
| `BLOQUANT` | La pièce passe à `REJETE` | Total HT incohérent |
| `AVERTISSEMENT` | La pièce passe à `VALIDE`, mais elle est signalée pour revue | Numéro de TVA du fournisseur absent |
| `ATTENTE` | La pièce reste `RECU` ; le contrôle est relancé plus tard | Courses de la facture pas encore reçues |

## 4. Règles

### 4.0 Conventions

**Chemins.** Les chemins sont relatifs au payload de l'événement (fiches v001 draft 4, §5) :

| Préfixe | Contenu | Exemple |
|---|---|---|
| `invoice.` | Bloc EN 16931 (structure du format pivot) | `invoice.totals.total_with_vat` |
| `stairling.` | Données hors norme | `stairling.activity_ids` |
| *(racine)* | Cycle de vie | `statut`, `controle` |
| *enveloppe* | Champs de l'événement | `invoice_key`, `recorded_at` |

Abréviations utilisées dans les tableaux :

| Abréviation | Chemin complet |
|---|---|
| `T.` | `invoice.totals.` |
| `VBD[]` | `invoice.vat_break_down[]` |
| SIREN vendeur | `invoice.seller.legal_registration_identifier.value` (schéma `0002`) |
| SIREN acheteur | `invoice.buyer.legal_registration_identifier.value` (schéma `0002`) |
| Catégorie et taux d'une ligne | `invoice.lines[].vat_information.invoiced_item_vat_category_code` et `invoiced_item_vat_rate` |

**Nombres.** Montants en centimes, taux × 100 (`2000` = 20 %), selon `numeric_encoding`. Tolérance nulle, sauf mention contraire.

### 4.1 N1 — Structure

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-IDEMPOTENCE` | Si un événement porte déjà la même `idempotency_key` (donc le même `event_id`) : l'événement n'est pas écrit et l'événement existant est renvoyé. Si la même `invoice_key` arrive avec un `invoice` différent sans `previous_document_id` : signalé en revue | ✓ | ✓ | — (ignoré à l'écriture, pas rejeté) |
| `STAIRLING-SCHEMA` | Le payload respecte le schéma JSON `urn:stairling:event:{FACTURE_VENTE\|FACTURE_ACHAT}:{schema_version}` (fiches v001 draft 4, §10) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-SHA256` | Le fichier d'origine existe dans la table `documents` ; son empreinte vaut `stairling.source.sha256` et son type vaut `stairling.source.media_type` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-PIVOT` | `stairling.pivot.format` = `urn:stairling:ocr-invoice` et `stairling.pivot.format_version` est une version connue du format pivot | ✓ | ✓ | BLOQUANT |
| `STAIRLING-DEVISE` | `T.total_vat_amount.currency_code` = `invoice.currency_code` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-STATUT-IDENTIQUE` | Pour un changement de statut : `invoice` et `stairling` sont identiques à ceux de l'événement `RECU` du même `document_id` ; seuls `statut`, `controle`, `motif` et `ecriture` changent | ✓ | ✓ | BLOQUANT (l'événement est refusé à l'écriture) |

### 4.2 N2 — Arithmétique EN 16931

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| BR-CO-10 | `T.sum_invoice_lines_amount` = Σ `invoice.lines[].net_amount` | ✓ | ✓ | BLOQUANT |
| BR-CO-13 | `T.total_without_vat` = `T.sum_invoice_lines_amount` − `T.sum_allowances_amount` + `T.sum_charges_amount` (0 si absents) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-SUM-BASES` | Σ `VBD[].vat_category_taxable_amount` = `T.total_without_vat` | ✓ | ✓ | BLOQUANT |
| BR-S-08 | Pour chaque entrée `VBD[]` de catégorie `S` : `vat_category_taxable_amount` = Σ `net_amount` des lignes de même catégorie et même taux − remises + frais de ce taux | ✓ | ✓ | BLOQUANT |
| BR-S-09 | Pour chaque entrée `S` : `vat_category_tax_amount` = `vat_category_taxable_amount` × `vat_category_rate`, arrondi au centime | ✓ | ✓ | AVERTISSEMENT si écart ≤ 1 centime par taux, BLOQUANT au-delà |
| `STAIRLING-ZERO-TVA` | Pour `O`, `E`, `Z`, `AE` : `vat_category_tax_amount` = 0 et `vat_category_rate` = 0 (ou absent) | ✓ | ✓ | BLOQUANT |
| BR-CO-14 | Σ `VBD[].vat_category_tax_amount` = `T.total_vat_amount.value` | ✓ | ✓ | BLOQUANT |
| BR-CO-15 | `T.total_with_vat` = `T.total_without_vat` + `T.total_vat_amount.value` | ✓ | ✓ | BLOQUANT |
| BR-CO-16 | `T.amount_due_for_payment` = `T.total_with_vat` − `T.paid_amount` (0 si absent) | ✓ | ✓ | BLOQUANT |
| BR-O-11 | Une entrée `VBD[]` de catégorie `O` coexiste avec une autre catégorie. Attendu en vente quand le mandataire imprime pourboire ou bonus en lignes (fiche VENTE v001 draft 4, §5.6) | ✓ | ✓ | AVERTISSEMENT (écart assumé à la norme) |
| `STAIRLING-MOTIF-EXONERATION` | Chaque entrée `VBD[]` de catégorie `AE`, `O`, `E` porte `vat_exemption_reason_code` | ✓ | ✓ | AVERTISSEMENT |

Une pièce reçue n'est jamais recalculée : on stocke les montants imprimés, et le contrôle mesure l'écart. C'est pourquoi un écart d'arrondi d'un centime (BR-S-09) est toléré avec avertissement.

### 4.3 N3 — Cohérence Stairling

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-DIRECTION` | Vente : SIREN vendeur = Stairling Union (`928978279`) ou chauffeur de la coopérative, avec `stairling.plateforme` émettrice sous mandat. Achat : SIREN vendeur ≠ Stairling Union ; si `invoice.buyer` est présent, SIREN acheteur (ou à défaut `invoice.buyer.name`) = Stairling Union ; s'il est absent, `stairling.rattachement.link_method` = `depot_ocr` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-DATES` | `invoice.delivery_date` et `invoice.invoicing_period` ne sont pas présents ensemble ; `invoicing_period.start_date` ≤ `end_date` ; date d'exécution ≤ `invoice.issue_date` (sauf acompte). Vente : l'un des deux est présent, et les dates des courses de `stairling.activity_ids` tombent à `delivery_date` ou dans la période | ✓ | ✓ | BLOQUANT |
| `STAIRLING-AVOIR` | `AVOIR_*` : `invoice.type_code` = `381` et `invoice.preceding_invoice_references[]` renseigné (au moins `reference`, BT-25). `FACTURE_*` : `invoice.type_code` ≠ `381` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-AVOIR-ORIGINE` | La facture citée par `invoice.preceding_invoice_references[].reference` existe dans le store au statut `VALIDE`. Recherche par `invoice_key` = `tenant_id` \| SIREN vendeur \| `reference` \| `380` ; si `issue_date` (BT-26) est présent, il doit valoir `invoice.issue_date` de la facture trouvée | ✓ | ✓ | ATTENTE, puis BLOQUANT après le délai |
| `STAIRLING-AVOIR-PLAFOND` | `T.total_with_vat` de l'avoir ≤ montant restant de la facture d'origine (après les avoirs déjà validés) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-DOUBLON` | Aucune autre pièce `VALIDE` ou `RECU` n'a la même `invoice_key` avec un autre `document_id`, sauf si elle est remplacée par celle-ci (`previous_document_id`) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-CLASSIFICATION` | Chaque ligne a une `invoice.lines[].category` de son sens (vente ou achat) ; `AUTRE` = revue humaine. Vente : `POURBOIRE` et `PRIME_PLATEFORME` sont en catégorie TVA `O` | ✓ | ✓ | BLOQUANT si `AUTRE` ou si la catégorie TVA ne correspond pas |
| `STAIRLING-RATTACHEMENT` | Vente : `stairling.rattachement.worker_id` présent et = `stream_id`. Achat : si `worker_id` est présent, il vaut `stream_id` et `link_method` est présent ; absent, la pièce est un frais de structure (flux `STAIRLING`) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-TVA-VENDEUR` | Si une ligne est `S` : `invoice.seller.vat_identifier` présent (BR-S-02) et égal au numéro de TVA de Stairling Union (`FR10928978279`) ou du chauffeur vendeur | ✓ | — | AVERTISSEMENT (à valider, §9) |
| `STAIRLING-TVA-FOURNISSEUR` | `invoice.seller.vat_identifier` présent quand de la TVA est déduite | — | ✓ | AVERTISSEMENT |
| `STAIRLING-RETARD` | La date d'exécution (`invoice.delivery_date`, à défaut `invoicing_period.end_date`, à défaut `issue_date`) n'est pas antérieure au dernier mois déjà régularisé (pas de clôture : la pièce reste comptabilisable) | ✓ | ✓ | AVERTISSEMENT : la pièce est comptabilisée à la prochaine régularisation, datée du mois régularisé |

### 4.4 N4 — Rapprochement

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-COURSES-PRESENTES` | Chaque identifiant de `stairling.activity_ids` existe dans le store | ✓ | — | ATTENTE, puis BLOQUANT après le délai |
| `STAIRLING-COURSE-SUM` | Par couple catégorie × taux de `VBD[]` : base et TVA = Σ des faits des courses de `stairling.activity_ids` (`CA_BRUT` / `TVA_COLLECTEE` pour `S` ; `POURBOIRE_ENCAISSE` et `PRIME_PLATEFORME` pour `O`, faits proposés dans la fiche VENTE v001 draft 4, §9) | ✓ | — | BLOQUANT |
| `STAIRLING-ENCAISSEMENT` | `T.paid_amount` (s'il est présent) = Σ `PAIEMENT_BANCAIRE` + `CASH_COLLECTE` des courses | ✓ | — | AVERTISSEMENT |
| `STAIRLING-PAIEMENT-FOURNISSEUR` | Un débit bancaire ou une note de frais correspond à `T.paid_amount` | — | ✓ | AVERTISSEMENT (rapprochement bancaire ultérieur) |

`STAIRLING-TOTAL-COLLECTED` (format pivot) ne s'applique plus aux ventes : le pourboire est une ligne de la facture et figure dans ses totaux.

## 5. Rapport de contrôle

La propriété `statut` du payload de la pièce porte le résultat du contrôle de cohérence (décision du 8 novembre 2026). Un changement de statut est un nouvel événement du **même type** que la pièce (`FACTURE_VENTE`, `FACTURE_ACHAT`…), avec :

| Champ de l'enveloppe | Valeur |
|---|---|
| `document_id`, `invoice_key`, `correlation_id` | Identiques à ceux de l'événement `RECU` |
| `idempotency_key` | `invoice_key` \| nouveau statut |
| `event_id` | UUID v5 de `idempotency_key` |
| `causation_id` | `event_id` de l'événement contrôlé |
| `actor` | `controle-engine` |

Le payload reprend `invoice` et `stairling` sans modification et porte le nouveau `statut`, le rapport `controle` et, en cas de rejet, le `motif`.

Chaque exécution du contrôle produit ce rapport :

```json
{
  "statut": "REJETE",
  "controle": {
    "run_id": "5a2f…",
    "executed_at": "2026-11-07T09:15:03Z",
    "rules_version": 2,
    "checks": [
      { "rule": "BR-CO-13", "level": "N2", "severity": "BLOQUANT", "result": "pass" },
      { "rule": "BR-O-11", "level": "N2", "severity": "AVERTISSEMENT", "result": "warning",
        "message": "Entrée O (pourboire et bonus) à côté d'entrées S" },
      { "rule": "STAIRLING-COURSE-SUM", "level": "N4", "severity": "BLOQUANT", "result": "fail",
        "vat_category_code": "S", "vat_rate": 1000,
        "expected": 2727, "actual": 2500, "ecart": 227,
        "message": "Base 10 % de la facture : 27,27 ; course UBER-8841 : 25,00" }
    ]
  },
  "motif": "STAIRLING-COURSE-SUM : écart de 2,27 € sur la base à 10 %"
}
```

| Champ | Description |
|---|---|
| `run_id` | Identifiant de l'exécution ; une pièce peut être contrôlée plusieurs fois (§6) |
| `rules_version` | Version du jeu de règles : un contrôle reste explicable après une évolution des règles. Ce document décrit la version `2` |
| `checks[].result` | `pass`, `fail`, `warning`, `pending` (attente) ou `not_applicable` |
| `expected` / `actual` / `ecart` | Valeurs comparées, en centimes, pour les règles numériques |
| `motif` | Résumé lisible des échecs bloquants ; obligatoire si `REJETE` |

**Décision** :

| Résultat des règles | Nouveau statut |
|---|---|
| Au moins un `fail` BLOQUANT | `REJETE` |
| Aucun `fail` bloquant, au moins un `pending` | Reste `RECU` (aucun événement de statut ; le rapport est journalisé) |
| Aucun `fail` bloquant, aucun `pending` | `VALIDE`, avec un indicateur `a_revoir` si au moins un `warning` |

## 6. Déclenchement et relance

| Déclencheur | Action |
|---|---|
| Arrivée d'une pièce (`RECU`) | Contrôle complet |
| Arrivée de faits d'une course (`CA_BRUT`…) citée dans `stairling.activity_ids` d'une pièce en attente | Relance du contrôle de cette pièce |
| Validation d'une facture dont l'`invoice_key` est citée par un avoir en attente | Relance du contrôle de l'avoir |
| Chaque nuit | Relance de toutes les pièces encore `RECU` |
| Délai dépassé : **7 jours** après `recorded_at` (proposé) | Les règles en `ATTENTE` deviennent BLOQUANTES : la pièce passe à `REJETE` |

Le délai de 7 jours couvre l'arrivée différée des données plateformes (commissions reçues à J+7). Il est à valider.

## 7. Revue humaine

Les pièces `REJETE` et les pièces `VALIDE` avec `a_revoir` alimentent une file de revue pour la DAF.

| Action | Effet dans le store | Autorisée pour |
|---|---|---|
| **Corriger** | Nouvelle version de la pièce : nouveau `document_id`, `previous_document_id` = ancien, au statut `RECU` ; même `invoice_key` et même `correlation_id` si le numéro et le vendeur sont inchangés. L'ancienne passe à `REMPLACE` ; la nouvelle est contrôlée | Erreur d'extraction OCR, erreur de saisie |
| **Confirmer le rejet** | Aucun nouvel événement ; la pièce reste `REJETE` et sort de la file | Doublon, pièce étrangère à Stairling |
| **Lever un avertissement** | Événement de revue avec `actor` = `daf:<nom>` et un motif | Règles de gravité AVERTISSEMENT uniquement |
| **Forcer la validation** | Interdit | Une règle BLOQUANTE ne se lève pas à la main : on corrige la pièce |

Une règle bloquante ne peut pas être levée manuellement : la seule issue est une nouvelle version corrigée de la pièce, ce qui garantit que toute écriture repose sur une pièce dont les montants sont cohérents.

**Attention, idempotence et correction** : avec `idempotency_key` = `invoice_key` \| statut, la version corrigée (même `invoice_key`, statut `RECU`) aurait la même clé que la version d'origine et serait ignorée par `STAIRLING-IDEMPOTENCE`. Voir §9.

## 8. Exemples

### 8.1 Vente validée avec avertissement

Facture Uber `UBER-FR-2026-118240` (`STAIRLING_Event_FACTURE_VENTE_exemple_pourboire_bonus_v001_draft_4.json`) : course 27,27 à 10 %, supplément 5,00 à 20 %, pourboire 3,00 et bonus 5,00 en `O` ; totaux 40,27 / 3,73 / 44,00.

- N1 passe (schéma, empreinte, devise).
- N2 passe, sauf BR-O-11 en avertissement (entrée `O` à côté des entrées `S`) ; `STAIRLING-MOTIF-EXONERATION` passe (`VATEX-EU-O`).
- N3 passe : SIREN vendeur `928978279`, `delivery_date` 2026-11-06, catégories `COURSE`, `SUPPLEMENT_COURSE`, `POURBOIRE`, `PRIME_PLATEFORME`, `worker_id` = `stream_id` = `ES-0042`.
- N4 passe dès que la course `UBER-8841` est dans le store avec les mêmes montants.

Statut `VALIDE` avec `a_revoir` (BR-O-11). Les faits sont produits, datés du 6 novembre (date de la course).

### 8.2 Vente en attente puis rejetée

Même facture, mais l'API n'a transmis que 25,00 € de base à 10 % pour la course. N1 à N3 passent ; `STAIRLING-COURSE-SUM` échoue avec un écart de 227 centimes à 10 % : statut `REJETE`, motif dans le rapport (§5). La DAF vérifie auprès de la plateforme : si la facture est juste, ce sont les faits de course qu'il faut compléter ; la facture est alors présentée de nouveau au contrôle.

### 8.3 Avoir sur le bonus

Avoir `UBER-FR-2026-118310` (`STAIRLING_Event_AVOIR_VENTE_exemple_bonus_v001_draft_4.json`) : `type_code` `381`, `preceding_invoice_references` = `UBER-FR-2026-118240` du 2026-11-07, une ligne `PRIME_PLATEFORME` de 5,00 en `O`.

- `STAIRLING-AVOIR` passe.
- `STAIRLING-AVOIR-ORIGINE` cherche `invoice_key` = `stairling-union|928978279|UBER-FR-2026-118240|380` : tant que cette facture n'est pas `VALIDE`, l'avoir reste `RECU` (ATTENTE) ; il est relancé à sa validation (§6).
- `STAIRLING-AVOIR-PLAFOND` : 5,00 ≤ 44,00.

### 8.4 Achat validé avec avertissement

Ticket T-0482 (`STAIRLING_Event_FACTURE_ACHAT_exemple_T-0482_v001_draft_4.json`) :

- N1 et N2 passent (5000 / 1000 / 6000).
- `STAIRLING-DIRECTION` passe : pas de `buyer`, `link_method` = `depot_ocr`, `worker_id` `ES-0042`.
- `STAIRLING-CLASSIFICATION` passe (`CARBURANT`).
- `STAIRLING-PAIEMENT-FOURNISSEUR` reste en avertissement tant que le relevé bancaire n'est pas rapproché.

Statut `VALIDE` avec `a_revoir`.

### 8.5 Cycle complet

Facture garage n° 1200 (`STAIRLING_Event_FACTURE_ACHAT_exemple_cycle_1200_v001_draft_4.json`) : RECU → VALIDE (rapport `controle` avec 5 règles en `pass`) → écriture → COMPTABILISE, chaque événement citant le précédent par `causation_id`.

## 9. Points à décider

- Délai d'attente avant rejet : 7 jours proposés (§6).
- Tolérance d'arrondi BR-S-09 : 1 centime par taux proposé (§4.2).
- Sur les factures Uber et Bolt réelles : SIREN affiché comme vendeur (Stairling ou chauffeur), pour `STAIRLING-DIRECTION`.
- Gravité de `STAIRLING-TVA-VENDEUR` : avertissement proposé ; bloquant si l'on refuse de comptabiliser une facture émise sous mandat sans numéro de TVA correct.
- **Idempotence d'une pièce corrigée (§7)** : la version corrigée reprend la même `invoice_key` et le statut `RECU`, donc la même `idempotency_key`, et serait ignorée. Proposition : `idempotency_key` = `invoice_key` \| `document_id` \| statut. Un rejeu du même document garde la même clé ; une correction (nouveau `document_id`) en crée une nouvelle ; `correlation_id`, calculé sur `invoice_key`, reste stable. À reporter dans les fiches v001 draft 4 (§3) si retenu.
- Faits `POURBOIRE_ENCAISSE` et `PRIME_PLATEFORME` utilisés par `STAIRLING-COURSE-SUM` : proposés dans la fiche VENTE v001 draft 4, à valider.

**Décidé le 8 novembre 2026** : le `statut` reste une propriété du payload de la pièce et sert de contrôle de cohérence de la facture (§5). Conséquence acceptée : à chaque changement de statut, le contenu de la pièce est repris dans le nouvel événement ; la règle `STAIRLING-STATUT-IDENTIQUE` (§4.1) vérifie que ce contenu est identique à celui de l'événement `RECU` (seuls `statut`, `controle`, `motif` et `ecriture` changent), sinon l'événement est refusé.

**Décidé le 10 novembre 2026** : payload des fiches v001 draft 4 (bloc `invoice` EN 16931, bloc `stairling` hors norme) ; pourboires et bonus en lignes de catégorie TVA `O`, BR-O-11 en avertissement ; rattachement par `worker_id`, `platform_driver_id`, `person_uuid`, `activity_ids`.
