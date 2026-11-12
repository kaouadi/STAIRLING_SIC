# STAIRLING — Contrôle des factures dans l'Event Store

| | |
|---|---|
| Document | Spécification du contrôle des pièces `FACTURE_VENTE`, `AVOIR_VENTE`, `FACTURE_ACHAT`, `AVOIR_ACHAT` |
| Version | v001 — 8 novembre 2026 ; mise à jour du 9 novembre 2026 : payload vente avec `seller`, `lines` et `amount_due_for_payment` (règles vente BR-CO-10, BR-S-08, BR-CO-16, `STAIRLING-CLASSIFICATION`, nouvelle règle `STAIRLING-TVA-VENDEUR`) ; payload achat avec `buyer` à la place de `buyer_siren` |
| Auteur | AOUADI Karim |
| Rattachement | `STAIRLING_Event_Payload_FACTURE_VENTE_v001.md`, `STAIRLING_Event_Payload_FACTURE_ACHAT_v001.md` ; proposition de mise à jour de l'Event Store, §5.4, §6, §7.3 |
| Norme | EN 16931 (règles BR-CO, BR-S) |

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

Montants en centimes. Tolérance nulle, sauf mention contraire.

### 4.1 N1 — Structure

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-SCHEMA` | Le payload respecte le schéma JSON de son type et de sa version | ✓ | ✓ | BLOQUANT |
| `STAIRLING-SHA256` | Le fichier d'origine existe dans la table `documents` et son empreinte vaut `sha256` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-STATUT-IDENTIQUE` | Pour un changement de statut : le payload est identique à celui de l'événement `RECU` du même `document_id`, hors `statut`, `controle`, `motif` et `ecriture` | ✓ | ✓ | BLOQUANT (l'événement est refusé à l'écriture) |

### 4.2 N2 — Arithmétique EN 16931

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| BR-CO-10 | `sum_invoice_lines_amount` = Σ `lines.net_amount` | ✓ | ✓ | BLOQUANT |
| BR-CO-13 | `total_without_vat` = `sum_invoice_lines_amount` − `sum_allowances_amount` + `sum_charges_amount` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-SUM-BASES` | Σ `vat_break_down.taxable_amount` = `total_without_vat` | ✓ | ✓ | BLOQUANT |
| BR-S-08 | Pour chaque taux `S` : `taxable_amount` = Σ lignes de ce taux − remises + frais de ce taux | ✓ | ✓ | BLOQUANT |
| BR-S-09 | Pour chaque taux `S` : `tax_amount` = `taxable_amount` × `vat_rate`, arrondi au centime | ✓ | ✓ | AVERTISSEMENT si écart ≤ 1 centime par taux, BLOQUANT au-delà |
| `STAIRLING-ZERO-TVA` | Pour `O`, `E`, `Z` : `tax_amount` = 0 et `vat_rate` = 0 | ✓ | ✓ | BLOQUANT |
| BR-CO-14 | Σ `vat_break_down.tax_amount` = `total_vat_amount` | ✓ | ✓ | BLOQUANT |
| BR-CO-15 | `total_with_vat` = `total_without_vat` + `total_vat_amount` | ✓ | ✓ | BLOQUANT |
| BR-CO-16 | `amount_due_for_payment` = `total_with_vat` − `paid_amount` (0 si absent) | ✓ | ✓ | BLOQUANT |

Une pièce reçue n'est jamais recalculée : on stocke les montants imprimés, et le contrôle mesure l'écart. C'est pourquoi un écart d'arrondi d'un centime (BR-S-09) est toléré avec avertissement.

### 4.3 N3 — Cohérence Stairling

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-DIRECTION` | Vente : `seller.siren` = Stairling Union ou chauffeur de la coopérative. Achat : `seller.siren` ≠ Stairling ; si `buyer` est présent, `buyer.siren` (ou à défaut `buyer.name`) = Stairling ; s'il est absent, `actor` = `ocr-engine` | ✓ | ✓ | BLOQUANT |
| `STAIRLING-DATES` | `start_date` ≤ `end_date` ; date d'exécution ≤ `issue_date` (sauf acompte) ; vente : `delivery_date` ou `invoicing_period` présent | ✓ | ✓ | BLOQUANT |
| `STAIRLING-AVOIR` | `AVOIR_*` : `type_code` = 381 et `preceding_invoice_number` renseigné. `FACTURE_*` : `type_code` ≠ 381 | ✓ | ✓ | BLOQUANT |
| `STAIRLING-AVOIR-ORIGINE` | La facture citée par `preceding_invoice_number` existe dans le store (même plateforme ou même fournisseur) au statut `VALIDE` | ✓ | ✓ | ATTENTE, puis BLOQUANT après le délai |
| `STAIRLING-AVOIR-PLAFOND` | Montant de l'avoir ≤ montant restant de la facture d'origine (après les avoirs déjà validés) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-DOUBLON` | Aucune autre pièce `VALIDE` ou `RECU` n'a la même clé : vente (`plateforme`, `number`) ; achat (`seller.siren` ou `seller.name`, `number`, `issue_date`) | ✓ | ✓ | BLOQUANT |
| `STAIRLING-CLASSIFICATION` | Chaque ligne a une `category` de son sens (vente ou achat) ; `AUTRE` = revue humaine | ✓ | ✓ | BLOQUANT si `AUTRE` |
| `STAIRLING-TVA-VENDEUR` | Si une ligne est `S` : `seller.vat_identifier` présent (BR-S-02) et égal au numéro de TVA de Stairling Union (`FR10928978279`) ou du chauffeur vendeur | ✓ | — | AVERTISSEMENT (à valider, §9) |
| `STAIRLING-TVA-FOURNISSEUR` | `seller.vat_identifier` présent quand de la TVA est déduite | — | ✓ | AVERTISSEMENT |
| `STAIRLING-RETARD` | La date d'exécution n'est pas antérieure au dernier mois déjà régularisé (pas de clôture : la pièce reste comptabilisable) | ✓ | ✓ | AVERTISSEMENT : la pièce est comptabilisée à la prochaine régularisation, datée du mois régularisé |

### 4.4 N4 — Rapprochement

| Règle | Contrôle | Vente | Achat | Gravité |
|---|---|---|---|---|
| `STAIRLING-COURSES-PRESENTES` | Chaque `course_ids` existe dans le store | ✓ | — | ATTENTE, puis BLOQUANT après le délai |
| `STAIRLING-COURSE-SUM` | Par couple catégorie × taux : `vat_break_down` = Σ des faits `CA_BRUT` / `TVA_COLLECTEE` des `course_ids` | ✓ | — | BLOQUANT |
| `STAIRLING-ENCAISSEMENT` | `paid_amount` (s'il est présent) = Σ `PAIEMENT_BANCAIRE` + `CASH_COLLECTE` des courses | ✓ | — | AVERTISSEMENT |
| `STAIRLING-PAIEMENT-FOURNISSEUR` | Un débit bancaire ou une note de frais correspond à `paid_amount` | — | ✓ | AVERTISSEMENT (rapprochement bancaire ultérieur) |

## 5. Rapport de contrôle

La propriété `statut` du payload de la pièce porte le résultat du contrôle de cohérence (décision du 8 novembre 2026). Un changement de statut est un nouvel événement du **même type** que la pièce (`FACTURE_VENTE`, `FACTURE_ACHAT`…), avec le **même `document_id`**, dont le payload reprend la pièce et porte le nouveau `statut`, le rapport `controle` et, en cas de rejet, le `motif`.

Chaque exécution du contrôle produit ce rapport :

```json
{
  "statut": "REJETE",
  "controle": {
    "run_id": "5a2f…",
    "executed_at": "2026-11-07T09:15:03Z",
    "rules_version": 1,
    "checks": [
      { "rule": "BR-CO-13", "level": "N2", "severity": "BLOQUANT", "result": "pass" },
      { "rule": "STAIRLING-COURSE-SUM", "level": "N4", "severity": "BLOQUANT", "result": "fail",
        "vat_category_code": "S", "vat_rate": 1000,
        "expected": 2700, "actual": 2500, "ecart": 200,
        "message": "Base 10 % de la facture : 27,00 ; courses UBER-8841 : 25,00" }
    ]
  },
  "motif": "STAIRLING-COURSE-SUM : écart de 2,00 € sur la base à 10 %"
}
```

| Champ | Description |
|---|---|
| `run_id` | Identifiant de l'exécution ; une pièce peut être contrôlée plusieurs fois (§6) |
| `rules_version` | Version du jeu de règles : un contrôle reste explicable après une évolution des règles |
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
| Arrivée de faits de course (`CA_BRUT`…) d'une course citée par une pièce en attente | Relance du contrôle de cette pièce |
| Validation d'une facture citée par un avoir en attente | Relance du contrôle de l'avoir |
| Chaque nuit | Relance de toutes les pièces encore `RECU` |
| Délai dépassé : **7 jours** après `recorded_at` (proposé) | Les règles en `ATTENTE` deviennent BLOQUANTES : la pièce passe à `REJETE` |

Le délai de 7 jours couvre l'arrivée différée des données plateformes (commissions reçues à J+7). Il est à valider.

## 7. Revue humaine

Les pièces `REJETE` et les pièces `VALIDE` avec `a_revoir` alimentent une file de revue pour la DAF.

| Action | Effet dans le store | Autorisée pour |
|---|---|---|
| **Corriger** | Nouvelle version de la pièce (`RECU`, `previous_document_id`) ; l'ancienne passe à `REMPLACE` ; la nouvelle est contrôlée | Erreur d'extraction OCR, erreur de saisie |
| **Confirmer le rejet** | Aucun nouvel événement ; la pièce reste `REJETE` et sort de la file | Doublon, pièce étrangère à Stairling |
| **Lever un avertissement** | Événement de revue avec `actor` = `daf:<nom>` et un motif | Règles de gravité AVERTISSEMENT uniquement |
| **Forcer la validation** | Interdit | Une règle BLOQUANTE ne se lève pas à la main : on corrige la pièce |

Une règle bloquante ne peut pas être levée manuellement : la seule issue est une nouvelle version corrigée de la pièce, ce qui garantit que toute écriture repose sur une pièce dont les montants sont cohérents.

## 8. Exemples

### 8.1 Vente validée

Facture Uber à trois taux (payload vente, §6) : N1 à N3 passent ; N4 passe dès que la course `UBER-8841` est dans le store (27,00 à 10 %, 6,00 à 20 %, 3,00 en `O`). Statut `VALIDE`, sans avertissement. Les faits `CA_BRUT` / `TVA_COLLECTEE` sont produits, datés du 7 novembre.

### 8.2 Vente en attente puis rejetée

Même facture, mais l'API n'a transmis que 25,00 € de base à 10 % pour la course. N1 à N3 passent ; `STAIRLING-COURSE-SUM` échoue avec un écart de 200 centimes à 10 % : statut `REJETE`, motif dans le rapport (§5). La DAF vérifie auprès de la plateforme : si la facture est juste, ce sont les faits de course qu'il faut compléter ; la facture est alors présentée de nouveau au contrôle.

### 8.3 Achat validé avec avertissement

Ticket T-0482 v002 (payload achat, §7) : N1 et N2 passent (5975 / 1137 / 7112) ; `STAIRLING-DIRECTION` passe (dépôt OCR de `ES-0042`) ; `STAIRLING-CLASSIFICATION` passe (aucune ligne `AUTRE`). `STAIRLING-PAIEMENT-FOURNISSEUR` reste en avertissement tant que le relevé bancaire n'est pas rapproché. Statut `VALIDE` avec `a_revoir`.

## 9. Points à décider

- Délai d'attente avant rejet : 7 jours proposés (§6).
- Tolérance d'arrondi BR-S-09 : 1 centime par taux proposé (§4.2).
- Sur les factures Uber et Bolt réelles : SIREN affiché comme vendeur (Stairling ou chauffeur), pour `STAIRLING-DIRECTION`.
- Gravité de `STAIRLING-TVA-VENDEUR` : avertissement proposé ; bloquant si l'on refuse de comptabiliser une facture émise sous mandat sans numéro de TVA correct.

**Décidé le 8 novembre 2026** : le `statut` reste une propriété du payload de la pièce et sert de contrôle de cohérence de la facture (§5). Conséquence acceptée : à chaque changement de statut, le contenu de la pièce est repris dans le nouvel événement ; la règle `STAIRLING-STATUT-IDENTIQUE` (§4.1) vérifie que ce contenu est identique à celui de l'événement `RECU` (seuls `statut`, `controle`, `motif` et `ecriture` changent), sinon l'événement est refusé.
