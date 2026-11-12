# STAIRLING — Payload de l'événement `FACTURE_ACHAT`

| | |
|---|---|
| Document | Description du payload `FACTURE_ACHAT` de l'Event Store (fiche de liaison) |
| Version | v001 — 8 novembre 2026 ; mise à jour du 9 novembre 2026 : `numeric_encoding` (entiers à l'échelle 2) ; bloc `buyer` (mêmes champs qu'à la vente) à la place de `buyer_siren` |
| Auteur | AOUADI Karim |
| Rattachement | Proposition de mise à jour de l'Event Store, §5.3, §5.4, §11.2 ; format pivot `urn:stairling:ocr-invoice` ; payload `FACTURE_VENTE` v001 |
| Norme | EN 16931 (`urn:cen.eu:en16931:2017`) |

## 1. Objet

L'événement `FACTURE_ACHAT` enregistre dans l'Event Store une facture ou un ticket d'achat reçu par Stairling Union pour l'activité d'un entrepreneur-salarié (carburant, péage, entretien…). La pièce arrive par l'extraction OCR (format pivot) ou directement d'un fournisseur.

L'événement `AVOIR_ACHAT` utilise le même payload, avec `type_code` = `381` et `preceding_invoice_number` renseigné. Le sens (achat) est porté par le type d'événement : `FACTURE_ACHAT` et `AVOIR_ACHAT` d'un côté, `FACTURE_VENTE` et `AVOIR_VENTE` de l'autre.

**Différences avec `FACTURE_VENTE`** :

Les blocs `seller`, `buyer`, `lines`, `vat_break_down` et `totals` ont les mêmes champs que dans `FACTURE_VENTE` : ventes et achats partagent le même format. Ce qui change :

- l'acheteur est toujours Stairling Union : le bloc `buyer` n'est présent que si la pièce mentionne l'acheteur, et sert au contrôle ; l'entrepreneur concerné est porté par le `stream_id` de l'enveloppe (ex. `ES-0042`) ;
- le bloc `seller` désigne le fournisseur, et non Stairling ;
- la catégorie de chaque ligne (`category`) est une catégorie de dépense, qui commande la déductibilité de la TVA ;
- `totals.paid_amount` et `amount_due_for_payment` alimentent `PAIEMENT_FOURNISSEUR` ;
- pas de `plateforme` ni de `course_ids`.

## 2. Structure du payload

```
FACTURE_ACHAT / AVOIR_ACHAT
├─ numeric_encoding  representation = scaled_integer, scale = 2 (20 % → 2000)
├─ statut, number, issue_date, type_code, preceding_invoice_number,
│  previous_document_id, payment_means_code
├─ controle, motif rapport du contrôle de cohérence (statut VALIDE ou REJETE)
├─ ecriture        lien vers l'écriture du journal d'achat (statut COMPTABILISE)
├─ delivery_date   date de livraison ou d'exécution (si différente de issue_date)
├─ invoicing_period  start_date, end_date (abonnement, location, assurance)
├─ seller          name, siren, siret, vat_identifier,
│                  address_line1, post_code, city, country_code
├─ buyer           buyer_type, name, siren, vat_identifier,      (si la pièce le mentionne)
│                  address_line1, post_code, city, country_code
├─ lines           [ {line_id, name, net_amount, vat_category_code, vat_rate, category}, … ]
├─ vat_break_down  [ {vat_category_code, vat_rate, taxable_amount, tax_amount}, … ]
├─ totals          sum_invoice_lines_amount, sum_allowances_amount, sum_charges_amount,
│                  total_without_vat, total_vat_amount, total_with_vat,
│                  paid_amount, amount_due_for_payment
└─ sha256
```

## 3. Index des blocs de données

| # | Bloc | Type | Norme EN 16931 | Obligatoire | Cardinalité | Champs | Rôle |
|---|---|---|---|---|---|---|---|
| 0 | `numeric_encoding` | objet | — (extension STAIRLING, reprise du format pivot OCR) | Oui | 1 | `representation`, `scale` | Déclarer l'encodage des nombres : entiers à l'échelle 2 |
| 1 | Identification (racine) | champs simples | BT-1, BT-2, BT-3, BT-25, BT-81 | Oui | 1 | `statut`, `number`, `issue_date`, `type_code`, `preceding_invoice_number`, `previous_document_id`, `payment_means_code` | Identifier la pièce, son état, sa version et son mode de paiement |
| 1b | Dates d'exécution | champ simple ou objet | BT-72, BG-14 (BT-73, BT-74) | Non | 0 ou 1 | `delivery_date` ou `invoicing_period.start_date` / `end_date` | Dater la livraison ou la prestation, distincte de la date d'émission |
| 2 | `seller` | objet | BG-4, BG-5 | Oui | 1 | `name`, `siren`, `siret`, `vat_identifier`, `address_line1`, `post_code`, `city`, `country_code` | Coordonnées du fournisseur ; le numéro de TVA conditionne la déduction |
| 3 | `buyer` | objet | BG-7, BG-8 | Non | 0 ou 1 | `buyer_type`, `name`, `siren`, `vat_identifier`, `address_line1`, `post_code`, `city`, `country_code` | Acheteur imprimé sur la pièce (Stairling Union) ; même bloc que `FACTURE_VENTE` |
| 4 | `lines` | tableau d'objets | BG-25 + classification Stairling | Oui | ≥ 1 ligne | `line_id`, `name`, `net_amount`, `vat_category_code`, `vat_rate`, `category` | Détail des achats et catégorie de dépense par ligne |
| 5 | `vat_break_down` | tableau d'objets | BG-23 | Oui | 1 entrée par couple catégorie × taux | `vat_category_code`, `vat_rate`, `taxable_amount`, `tax_amount` | Base HT et TVA par taux |
| 6 | `totals` | objet | BG-22 | Oui | 1 | `sum_invoice_lines_amount`, `sum_allowances_amount`, `sum_charges_amount`, `total_without_vat`, `total_vat_amount`, `total_with_vat`, `paid_amount`, `amount_due_for_payment` | Sous-totaux, totaux, montant payé et reste à payer |
| 7 | `sha256` | chaîne | — | Oui | 1 | `sha256` | Empreinte du fichier d'origine (photo, PDF, XML) |

**Encodage numérique** : le payload déclare l'encodage de ses nombres dans `numeric_encoding`, extension STAIRLING reprise du format pivot OCR (`STAIRLING_Format_Facture_OCR`, `numeric_encoding`). EN 16931 ne la prévoit pas : la norme écrit des décimaux. Une seule valeur est admise : `scaled_integer` à l'échelle 2. Les montants sont en centimes (`7112` = 71,12 €) ; les taux sont multipliés par 100 (`2000` = 20 %, `1000` = 10 %, `550` = 5,5 %) ; valeur = entier ÷ 100. Aucun nombre à virgule flottante. Vers un tiers (logiciel comptable, plateforme agréée), les valeurs sont converties en décimal.

```json
"numeric_encoding": { "representation": "scaled_integer", "scale": 2 }
```

## 4. Détail des blocs

### 4.1 Identification

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `statut` | enum | — | Oui | Cycle de vie de la pièce : `RECU`, `VALIDE` (contrôlée, en attente de comptabilisation), `REJETE`, `COMPTABILISE` (enregistrée dans le journal d'achat), `REMPLACE`. Un changement de statut = un nouvel événement `FACTURE_ACHAT` avec le même `document_id` (enveloppe) et le même contenu ; seuls `statut`, `controle`, `motif` et `ecriture` changent |
| `ecriture` | objet | — | Si `COMPTABILISE` | Lien vers l'écriture : `event_id` (de l'`ECRITURE_COMPTABILISEE`), `journal`, `ecriture_num`, `ecriture_date` |
| `controle` | objet | — | Si `VALIDE` ou `REJETE` | Rapport du contrôle : `run_id`, `executed_at`, `rules_version`, `checks[]` (règle, niveau, gravité, résultat, attendu, trouvé, écart) |
| `motif` | chaîne | — | Si `REJETE` | Résumé lisible des règles bloquantes en échec |
| `number` | chaîne | BT-1 | Oui | Numéro de la facture ou du ticket |
| `issue_date` | date | BT-2 | Oui | Date d'émission (`AAAA-MM-JJ`) |
| `type_code` | enum | BT-3 | Oui | `380` facture, `381` avoir, `384` facture rectificative |
| `preceding_invoice_number` | chaîne | BT-25 | Si `381` ou `384` | Numéro de la facture d'origine |
| `previous_document_id` | UUID | — | Si nouvelle version | `document_id` de la version remplacée (correction d'extraction OCR) |
| `payment_means_code` | chaîne | BT-81 | Non | Code UNTDID 4461 : `48` carte, `30` virement, `10` espèces |

### 4.1 bis Dates : émission et exécution

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `issue_date` | date | BT-2 | Oui | Date d'**émission** de la pièce (rappel, §4.1) |
| `delivery_date` | date | BT-72 | Non | Date de **livraison ou d'exécution** : jour du plein, de la réparation |
| `invoicing_period.start_date` | date | BT-73 | Non | Début de la période facturée (location, assurance, forfait téléphone) |
| `invoicing_period.end_date` | date | BT-74 | Non | Fin de la période facturée |

Si aucun des deux n'est présent, la date d'exécution est réputée égale à `issue_date` : c'est le cas d'un ticket de caisse.

**Dans l'Event Store** : l'événement `FACTURE_ACHAT` a pour `occurred_at` la date d'émission ; les faits `ACHAT_HT` et `TVA_DEDUCTIBLE` ont pour `occurred_at` la date d'exécution (ou la fin de la période). Une charge couvrant une période à cheval sur deux exercices (assurance annuelle) se répartit grâce à `invoicing_period` (charge constatée d'avance).

### 4.2 `seller` — fournisseur

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-27 | Oui | Raison sociale |
| `siren` | chaîne (9 chiffres) | BT-30 (schéma 0002) | Non | SIREN du fournisseur |
| `siret` | chaîne (14 chiffres) | BT-29 (schéma 0225) | Non | SIRET de l'établissement |
| `vat_identifier` | chaîne | BT-31 | Non | Numéro de TVA intracommunautaire ; son absence fait vérifier le droit à déduction |
| `address_line1` | chaîne | BT-35 | Non | Adresse |
| `post_code` | chaîne | BT-38 | Non | Code postal |
| `city` | chaîne | BT-37 | Non | Ville |
| `country_code` | chaîne (2 lettres) | BT-40 | Oui | Code pays ISO 3166 ; hors `FR`, vérifier l'autoliquidation |

Le fournisseur est une entreprise : ses coordonnées peuvent être conservées dans l'événement sans contrainte de données personnelles.

### 4.3 `buyer` — acheteur

Mêmes champs que le bloc `buyer` de `FACTURE_VENTE`. L'acheteur d'une pièce d'achat est toujours Stairling Union : le bloc ne sert qu'au contrôle `STAIRLING-DIRECTION`.

Le bloc n'est écrit que si la pièce mentionne l'acheteur. Il est absent sur un ticket de caisse non nominatif. Une valeur déduite par l'OCR (`status: inferred` dans le format pivot) n'est pas reprise.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `buyer_type` | enum | — | Oui (si `buyer`) | Toujours `B2B` |
| `name` | chaîne | BT-44 | Oui (si `buyer`) | Raison sociale imprimée ; doit désigner Stairling Union |
| `siren` | chaîne (9 chiffres) | BT-47 | Non | SIREN imprimé ; doit valoir `928978279` |
| `vat_identifier` | chaîne | BT-48 | Non | Numéro de TVA imprimé ; doit valoir `FR10928978279` |
| `address_line1` | chaîne | BT-50 | Non | Adresse |
| `post_code` | chaîne | BT-53 | Non | Code postal |
| `city` | chaîne | BT-52 | Non | Ville |
| `country_code` | chaîne (2 lettres) | BT-55 | Non | Code pays ISO 3166 |

À la différence de la vente, `country_code` n'est pas obligatoire et `siren` n'est pas exigé pour un `B2B` : on reprend ce que la pièce imprime, sans le compléter. Une pièce adressée au chauffeur en son nom propre, et non à Stairling, échoue à `STAIRLING-DIRECTION` (revue : droit à déduction).

### 4.4 `lines` — lignes d'achat

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `line_id` | chaîne | BT-126 | Oui | Identifiant de la ligne sur la pièce |
| `name` | chaîne | BT-153 | Oui | Libellé de l'article (ex. « Gazole B7 ») |
| `net_amount` | entier (centimes) | BT-131 | Oui | Montant HT net de la ligne |
| `vat_category_code` | enum | BT-151 | Oui | Catégorie TVA de la ligne |
| `vat_rate` | entier (échelle 2) | BT-152 | Oui | Taux de TVA de la ligne |
| `category` | enum | Classification Stairling | Oui | Catégorie de dépense (liste ci-dessous) |

Catégories d'achat, reprises de `stairling:classification` du format pivot : `CARBURANT`, `RECHARGE_ELECTRIQUE`, `PEAGE`, `STATIONNEMENT`, `LAVAGE`, `ENTRETIEN_REPARATION`, `ASSURANCE`, `LOCATION_VEHICULE`, `TELEPHONE_INTERNET`, `FOURNITURES_CLIENT`, `COMMISSION_PLATEFORME`, `AUTRE` (revue humaine obligatoire).

Quantité et prix unitaire ne sont pas repris : ils restent dans le JSON pivot (table `documents`).

### 4.5 `vat_break_down` — ventilation TVA

Une entrée par couple catégorie × taux. Une remise ou un frais global porte son propre taux et s'impute sur l'entrée correspondante.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `vat_category_code` | enum | BT-118 | Oui | `S` taux normal ou réduit, `AE` autoliquidation, `O` hors champ, `E` exonéré, `Z` taux zéro |
| `vat_rate` | entier (échelle 2) | BT-119 | Oui | `2000` = 20 %, `1000` = 10 %, `550` = 5,5 % ; `0` pour `O`, `E`, `Z` |
| `taxable_amount` | entier (centimes) | BT-116 | Oui | Base HT du taux = lignes − remises + frais de ce taux |
| `tax_amount` | entier (centimes) | BT-117 | Oui | TVA du taux, telle qu'imprimée sur la pièce |

### 4.6 `totals` — sous-totaux

| Champ | Type | Norme | Obligatoire | Description | Calcul |
|---|---|---|---|---|---|
| `sum_invoice_lines_amount` | entier (centimes) | BT-106 | Oui | Somme des montants HT nets des lignes | Σ `lines.net_amount` |
| `sum_allowances_amount` | entier (centimes) | BT-107 | Non | Remises globales (niveau facture) | Σ remises |
| `sum_charges_amount` | entier (centimes) | BT-108 | Non | Frais globaux (niveau facture) | Σ frais |
| `total_without_vat` | entier (centimes) | BT-109 | Oui | Total HT | BT-106 − BT-107 + BT-108 |
| `total_vat_amount` | entier (centimes) | BT-110 | Oui | Total TVA | Σ `tax_amount` |
| `total_with_vat` | entier (centimes) | BT-112 | Oui | Total TTC | BT-109 + BT-110 |
| `paid_amount` | entier (centimes) | BT-113 | Non | Montant déjà payé (ticket payé en caisse) | — |
| `amount_due_for_payment` | entier (centimes) | BT-115 | Oui | Reste à payer | BT-112 − BT-113 |

## 5. Contrôles à la validation

| Règle | Contrôle |
|---|---|
| BR-CO-10 | `sum_invoice_lines_amount` = Σ `lines.net_amount` |
| BR-CO-13 | `total_without_vat` = `sum_invoice_lines_amount` − `sum_allowances_amount` + `sum_charges_amount` |
| BR-S-08 | Pour chaque entrée `S` : `taxable_amount` = Σ lignes de ce taux − remises + frais de ce taux |
| BR-S-09 | Pour chaque entrée `S` : `tax_amount` = `taxable_amount` × `vat_rate`, arrondi au centime |
| BR-CO-14 | Σ `vat_break_down.tax_amount` = `total_vat_amount` |
| BR-CO-15 | `total_with_vat` = `total_without_vat` + `total_vat_amount` |
| BR-CO-16 | `amount_due_for_payment` = `total_with_vat` − `paid_amount` |
| STAIRLING-CLASSIFICATION | Chaque ligne a une `category` ; `AUTRE` bloque la validation jusqu'à revue humaine |
| STAIRLING-DATES | `start_date` ≤ `end_date` ; `delivery_date` et `invoicing_period` ne sont pas présents ensemble |
| STAIRLING-DIRECTION | `seller.siren` ≠ SIREN de Stairling Union ; si `buyer` est présent, `buyer.siren` (ou à défaut `buyer.name`) désigne Stairling Union ; si `buyer` est absent, la pièce doit venir d'un dépôt d'entrepreneur (`actor` = `ocr-engine` dans l'enveloppe) |
| STAIRLING-AVOIR | Pour `AVOIR_ACHAT` : `type_code` = `381` et `preceding_invoice_number` renseigné ; pour `FACTURE_ACHAT` : `type_code` ≠ `381` |

Tous les contrôles passent : nouvel événement au statut `VALIDE`. Un contrôle échoue : statut `REJETE` avec le motif, aucune écriture produite.

## 6. Faits produits à la validation

| Fait | Regroupement | Contenu |
|---|---|---|
| `ACHAT_HT` | un par couple `category` × taux | Σ `net_amount` des lignes du couple |
| `TVA_DEDUCTIBLE` | un par couple `category` × taux | TVA du taux répartie au prorata des bases ; le reste d'arrondi va à la plus grosse ligne ; `deductible_ratio` selon la catégorie |
| `PAIEMENT_FOURNISSEUR` | un par pièce, si `paid_amount` > 0 | `paid_amount`, `payment_means_code` |

## 7. Exemple

Ticket T-0482, version v002 (trois lignes, deux taux), qui remplace la v001 où une seule ligne avait été extraite.

| Ligne | Libellé | HT | Taux | Catégorie |
|---|---|---|---|---|
| 1 | Gazole B7 | 50,00 | 20 % | `CARBURANT` |
| 2 | Lave-glace 5 L | 5,75 | 20 % | `ENTRETIEN_REPARATION` |
| 3 | Eau minérale pack 6 x 50 cl | 4,00 | 5,5 % | `FOURNITURES_CLIENT` |

```json
{
  "numeric_encoding": { "representation": "scaled_integer", "scale": 2 },
  "statut": "RECU",
  "number": "T-0482",
  "issue_date": "2026-10-15",
  "type_code": "380",
  "previous_document_id": "91dcf6ab-9b33-41d6-bbda-5930ee798e31",
  "payment_means_code": "48",
  "seller": {
    "name": "Station Exemple SAS",
    "siren": "123456782",
    "siret": "12345678200028",
    "vat_identifier": "FR11123456782",
    "address_line1": "1 avenue de l'Exemple",
    "post_code": "93200",
    "city": "Saint-Denis",
    "country_code": "FR"
  },
  "lines": [
    { "line_id": "1", "name": "Gazole B7", "net_amount": 5000, "vat_category_code": "S", "vat_rate": 2000, "category": "CARBURANT" },
    { "line_id": "2", "name": "Lave-glace 5 L", "net_amount": 575, "vat_category_code": "S", "vat_rate": 2000, "category": "ENTRETIEN_REPARATION" },
    { "line_id": "3", "name": "Eau minérale pack 6 x 50 cl", "net_amount": 400, "vat_category_code": "S", "vat_rate": 550, "category": "FOURNITURES_CLIENT" }
  ],
  "vat_break_down": [
    { "vat_category_code": "S", "vat_rate": 2000, "taxable_amount": 5575, "tax_amount": 1115 },
    { "vat_category_code": "S", "vat_rate": 550,  "taxable_amount": 400,  "tax_amount": 22 }
  ],
  "totals": {
    "sum_invoice_lines_amount": 5975,
    "total_without_vat": 5975,
    "total_vat_amount": 1137,
    "total_with_vat": 7112,
    "paid_amount": 7112,
    "amount_due_for_payment": 0
  },
  "sha256": "…"
}
```

`delivery_date` est absent : sur un ticket de caisse, le plein est fait le jour de l'émission (15 octobre 2026), qui sert de date d'exécution.

`buyer` est absent : le ticket ne mentionne pas l'acheteur (le format pivot l'a seulement déduit, `status: inferred`). `STAIRLING-DIRECTION` passe car la pièce vient d'un dépôt OCR de l'entrepreneur `ES-0042`.

Contrôles : 5000 + 575 + 400 = 5975 (BR-CO-10) ; 5000 + 575 = 5575 à 20 % (BR-S-08) ; 1115 + 22 = 1137 (BR-CO-14) ; 5975 + 1137 = 7112 (BR-CO-15) ; 7112 − 7112 = 0 (BR-CO-16).

Faits produits à la validation :

| Fait | Catégorie | Taux | Montant |
|---|---|---|---|
| `ACHAT_HT` | `CARBURANT` | 20 % | 5000 |
| `ACHAT_HT` | `ENTRETIEN_REPARATION` | 20 % | 575 |
| `ACHAT_HT` | `FOURNITURES_CLIENT` | 5,5 % | 400 |
| `TVA_DEDUCTIBLE` | `CARBURANT` | 20 % | 1000 (1115 × 5000 / 5575) |
| `TVA_DEDUCTIBLE` | `ENTRETIEN_REPARATION` | 20 % | 115 (1115 × 575 / 5575) |
| `TVA_DEDUCTIBLE` | `FOURNITURES_CLIENT` | 5,5 % | 22 |
| `PAIEMENT_FOURNISSEUR` | — | — | 7112, carte (`48`) |

## 8. Schéma JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:stairling:event:FACTURE_ACHAT:1",
  "type": "object",
  "required": ["numeric_encoding", "statut", "number", "issue_date", "type_code",
               "seller", "lines", "vat_break_down", "totals", "sha256"],
  "properties": {
    "numeric_encoding": {
      "type": "object",
      "description": "Extension STAIRLING (format pivot OCR) : montants en centimes, taux × 100 (2000 = 20 %)",
      "required": ["representation", "scale"],
      "properties": {
        "representation": { "const": "scaled_integer" },
        "scale":          { "const": 2 }
      }
    },
    "statut":      { "enum": ["RECU", "VALIDE", "REJETE", "COMPTABILISE", "REMPLACE"] },
    "ecriture": {
      "type": "object",
      "required": ["event_id", "journal", "ecriture_date"],
      "properties": {
        "event_id":      { "type": "string", "format": "uuid" },
        "journal":       { "type": "string", "examples": ["JA"] },
        "ecriture_num":  { "type": "string" },
        "ecriture_date": { "type": "string", "format": "date" }
      }
    },
    "controle":    { "$ref": "#/$defs/RapportControle" },
    "motif":       { "type": "string", "description": "Obligatoire si statut = REJETE" },
    "number":      { "type": "string", "description": "BT-1" },
    "issue_date": { "type": "string", "format": "date", "description": "BT-2" },
    "type_code":  { "enum": ["380", "381", "384"], "description": "BT-3" },
    "preceding_invoice_number": { "type": "string", "description": "BT-25, obligatoire pour 381 et 384" },
    "previous_document_id":     { "type": "string", "format": "uuid", "description": "Version remplacée" },
    "payment_means_code":       { "type": "string", "description": "BT-81, UNTDID 4461" },

    "delivery_date": { "type": "string", "format": "date", "description": "BT-72, date de livraison ou d'exécution" },
    "invoicing_period": {
      "type": "object",
      "description": "BG-14, période facturée",
      "required": ["start_date", "end_date"],
      "properties": {
        "start_date": { "type": "string", "format": "date", "description": "BT-73" },
        "end_date":   { "type": "string", "format": "date", "description": "BT-74" }
      }
    },

    "seller": {
      "type": "object",
      "description": "BG-4 / BG-5",
      "required": ["name", "country_code"],
      "properties": {
        "name":           { "type": "string", "description": "BT-27" },
        "siren":          { "type": "string", "pattern": "^[0-9]{9}$", "description": "BT-30" },
        "siret":          { "type": "string", "pattern": "^[0-9]{14}$", "description": "BT-29" },
        "vat_identifier": { "type": "string", "description": "BT-31" },
        "address_line1":  { "type": "string", "description": "BT-35" },
        "post_code":      { "type": "string", "description": "BT-38" },
        "city":           { "type": "string", "description": "BT-37" },
        "country_code":   { "type": "string", "pattern": "^[A-Z]{2}$", "description": "BT-40" }
      }
    },

    "buyer": {
      "type": "object",
      "description": "BG-7 / BG-8, présent seulement si la pièce mentionne l'acheteur (Stairling Union)",
      "required": ["buyer_type", "name"],
      "properties": {
        "buyer_type":     { "const": "B2B" },
        "name":           { "type": "string", "description": "BT-44" },
        "siren":          { "type": "string", "pattern": "^[0-9]{9}$", "description": "BT-47" },
        "vat_identifier": { "type": "string", "description": "BT-48" },
        "address_line1":  { "type": "string", "description": "BT-50" },
        "post_code":      { "type": "string", "description": "BT-53" },
        "city":           { "type": "string", "description": "BT-52" },
        "country_code":   { "type": "string", "pattern": "^[A-Z]{2}$", "description": "BT-55" }
      }
    },

    "lines": {
      "type": "array", "minItems": 1, "description": "BG-25",
      "items": {
        "type": "object",
        "required": ["line_id", "name", "net_amount", "vat_category_code", "vat_rate", "category"],
        "properties": {
          "line_id":           { "type": "string", "description": "BT-126" },
          "name":              { "type": "string", "description": "BT-153" },
          "net_amount":        { "$ref": "#/$defs/Montant", "description": "BT-131" },
          "vat_category_code": { "$ref": "#/$defs/CategorieTVA", "description": "BT-151" },
          "vat_rate":          { "$ref": "#/$defs/Taux", "description": "BT-152" },
          "category":          { "$ref": "#/$defs/CategorieAchat" }
        }
      }
    },

    "vat_break_down": {
      "type": "array", "minItems": 1, "description": "BG-23, une entrée par taux",
      "items": { "$ref": "#/$defs/VentilationTVA" }
    },

    "totals": {
      "type": "object",
      "description": "BG-22",
      "required": ["sum_invoice_lines_amount", "total_without_vat", "total_vat_amount",
                   "total_with_vat", "amount_due_for_payment"],
      "properties": {
        "sum_invoice_lines_amount": { "$ref": "#/$defs/Montant", "description": "BT-106" },
        "sum_allowances_amount":    { "$ref": "#/$defs/Montant", "description": "BT-107" },
        "sum_charges_amount":       { "$ref": "#/$defs/Montant", "description": "BT-108" },
        "total_without_vat":        { "$ref": "#/$defs/Montant", "description": "BT-109" },
        "total_vat_amount":         { "$ref": "#/$defs/Montant", "description": "BT-110" },
        "total_with_vat":           { "$ref": "#/$defs/Montant", "description": "BT-112" },
        "paid_amount":              { "$ref": "#/$defs/Montant", "description": "BT-113" },
        "amount_due_for_payment":   { "$ref": "#/$defs/Montant", "description": "BT-115" }
      }
    },

    "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
  },

  "allOf": [
    { "if":   { "properties": { "type_code": { "enum": ["381", "384"] } } },
      "then": { "required": ["preceding_invoice_number"] } },
    { "if":   { "properties": { "statut": { "enum": ["VALIDE", "REJETE", "COMPTABILISE"] } } },
      "then": { "required": ["controle"] } },
    { "if":   { "properties": { "statut": { "const": "COMPTABILISE" } } },
      "then": { "required": ["ecriture"] } },
    { "if":   { "properties": { "statut": { "const": "REJETE" } } },
      "then": { "required": ["motif"] } }
  ],

  "not": { "required": ["delivery_date", "invoicing_period"] },

  "$defs": {
    "RapportControle": {
      "type": "object",
      "description": "Voir STAIRLING_Controle_Facture_v001.md §5",
      "required": ["run_id", "executed_at", "rules_version", "checks"],
      "properties": {
        "run_id":        { "type": "string" },
        "executed_at":   { "type": "string", "format": "date-time" },
        "rules_version": { "type": "integer" },
        "checks": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["rule", "level", "severity", "result"],
            "properties": {
              "rule":     { "type": "string" },
              "level":    { "enum": ["N1", "N2", "N3", "N4"] },
              "severity": { "enum": ["BLOQUANT", "AVERTISSEMENT", "ATTENTE"] },
              "result":   { "enum": ["pass", "fail", "warning", "pending", "not_applicable"] },
              "vat_category_code": { "$ref": "#/$defs/CategorieTVA" },
              "vat_rate": { "$ref": "#/$defs/Taux" },
              "expected": { "$ref": "#/$defs/Montant" },
              "actual":   { "$ref": "#/$defs/Montant" },
              "ecart":    { "$ref": "#/$defs/Montant" },
              "message":  { "type": "string" }
            }
          }
        }
      }
    },
    "Montant":      { "type": "integer", "description": "Centimes (scale 2)" },
    "Taux":         { "type": "integer", "description": "Scale 2 : 2000 = 20,00 %" },
    "CategorieTVA": { "enum": ["S", "AE", "O", "E", "Z"], "description": "EN 16931 BT-118 / BT-151" },
    "CategorieAchat": {
      "enum": ["CARBURANT", "RECHARGE_ELECTRIQUE", "PEAGE", "STATIONNEMENT", "LAVAGE",
               "ENTRETIEN_REPARATION", "ASSURANCE", "LOCATION_VEHICULE", "TELEPHONE_INTERNET",
               "FOURNITURES_CLIENT", "COMMISSION_PLATEFORME", "AUTRE"],
      "description": "Sous-ensemble achat de stairling:classification (format pivot)"
    },
    "VentilationTVA": {
      "type": "object",
      "required": ["vat_category_code", "vat_rate", "taxable_amount", "tax_amount"],
      "properties": {
        "vat_category_code": { "$ref": "#/$defs/CategorieTVA" },
        "vat_rate":          { "$ref": "#/$defs/Taux" },
        "taxable_amount":    { "$ref": "#/$defs/Montant" },
        "tax_amount":        { "$ref": "#/$defs/Montant" }
      }
    }
  }
}
```
