# STAIRLING — Payload de l'événement `FACTURE_VENTE`

| | |
|---|---|
| Document | Description du payload `FACTURE_VENTE` de l'Event Store (fiche de liaison) |
| Version | v001 — 8 novembre 2026 ; mise à jour du 9 novembre 2026 : `numeric_encoding` (entiers à l'échelle 2) ; bloc `lines` et `totals.amount_due_for_payment`, alignés sur `FACTURE_ACHAT` ; bloc `seller` à la place de `seller_siren` |
| Auteur | AOUADI Karim |
| Rattachement | Proposition de mise à jour de l'Event Store, §5.4, §7 et §13.2 ; note de conception Event Sourcing du 10 mai 2026 |
| Norme | EN 16931 (`urn:cen.eu:en16931:2017`) |

## 1. Objet

L'événement `FACTURE_VENTE` enregistre dans l'Event Store une facture de vente émise par une plateforme (Uber, Bolt, Heetch, FreeNow) **au nom et pour le compte de Stairling Union**, sous mandat de facturation. Le SIC n'émet pas de facture de vente : il reçoit celle du mandataire, la contrôle et la rattache aux courses.

L'événement `AVOIR_VENTE` utilise le même payload, avec `type_code` = `381` et `preceding_invoice_number` renseigné. Le sens (vente) est porté par le type d'événement : `FACTURE_VENTE` et `AVOIR_VENTE` d'un côté, `FACTURE_ACHAT` et `AVOIR_ACHAT` de l'autre.

Ventes et achats partagent le même format : les blocs `seller`, `buyer`, `lines`, `vat_break_down` et `totals` ont les mêmes champs que dans `STAIRLING_Event_Payload_FACTURE_ACHAT_v001.md`. Seuls changent les champs obligatoires (`buyer` toujours présent à la vente, seulement s'il est imprimé à l'achat), les champs propres à la vente (`plateforme`, `course_ids`) et la liste des catégories de ligne.

## 2. Structure du payload

```
FACTURE_VENTE / AVOIR_VENTE
├─ numeric_encoding  representation = scaled_integer, scale = 2 (20 % → 2000)
├─ statut, plateforme, number, issue_date, type_code,
│  preceding_invoice_number, course_ids
├─ controle, motif rapport du contrôle de cohérence (statut VALIDE ou REJETE)
├─ ecriture        lien vers l'écriture du journal de vente (statut COMPTABILISE)
├─ delivery_date   date d'exécution de la prestation (une course)
├─ invoicing_period  start_date, end_date (plusieurs courses)
├─ seller          name, siren, siret, vat_identifier,
│                  address_line1, post_code, city, country_code
├─ buyer           buyer_type, name, siren, vat_identifier,
│                  address_line1, post_code, city, country_code
├─ lines           [ {line_id, name, net_amount, vat_category_code, vat_rate, category}, … ]
├─ vat_break_down  [ {vat_category_code, vat_rate, taxable_amount, tax_amount}, … ]
├─ totals          sum_invoice_lines_amount, sum_allowances_amount, sum_charges_amount,
│                  total_without_vat, total_vat_amount, total_with_vat,
│                  amount_due_for_payment
└─ sha256
```

## 3. Index des blocs de données

| # | Bloc | Type | Norme EN 16931 | Obligatoire | Cardinalité | Champs | Rôle |
|---|---|---|---|---|---|---|---|
| 0 | `numeric_encoding` | objet | — (extension STAIRLING, reprise du format pivot OCR) | Oui | 1 | `representation`, `scale` | Déclarer l'encodage des nombres : entiers à l'échelle 2 |
| 1 | Identification (racine) | champs simples | BT-1, BT-2, BT-3, BT-25 | Oui | 1 | `statut`, `plateforme`, `number`, `issue_date`, `type_code`, `preceding_invoice_number`, `course_ids` | Identifier la facture, son état et les courses couvertes |
| 1b | Dates d'exécution | champ simple ou objet | BT-72, BG-14 (BT-73, BT-74) | L'un des deux | 1 | `delivery_date` ou `invoicing_period.start_date` / `end_date` | Dater la prestation, distincte de la date d'émission |
| 2 | `seller` | objet | BG-4, BG-5 | Oui | 1 | `name`, `siren`, `siret`, `vat_identifier`, `address_line1`, `post_code`, `city`, `country_code` | Vendeur : Stairling Union ou chauffeur de la coopérative ; même bloc que `FACTURE_ACHAT` |
| 3 | `buyer` | objet | BG-7, BG-8 | Oui | 1 | `buyer_type`, `name`, `siren`, `vat_identifier`, `address_line1`, `post_code`, `city`, `country_code` | Coordonnées de l'acheteur (passager ou client professionnel) |
| 4 | `lines` | tableau d'objets | BG-25 + classification Stairling | Oui | ≥ 1 ligne | `line_id`, `name`, `net_amount`, `vat_category_code`, `vat_rate`, `category` | Détail des prestations facturées et catégorie de revenu par ligne |
| 5 | `vat_break_down` | tableau d'objets | BG-23 | Oui | 1 entrée par couple catégorie × taux | `vat_category_code`, `vat_rate`, `taxable_amount`, `tax_amount` | Base HT et TVA par taux |
| 6 | `totals` | objet | BG-22 | Oui | 1 | `sum_invoice_lines_amount`, `sum_allowances_amount`, `sum_charges_amount`, `total_without_vat`, `total_vat_amount`, `total_with_vat`, `amount_due_for_payment` | Sous-totaux, totaux et montant à payer de la facture entière |
| 7 | `sha256` | chaîne | — | Oui | 1 | `sha256` | Empreinte du fichier d'origine (piste d'audit) |

**Encodage numérique** : le payload déclare l'encodage de ses nombres dans `numeric_encoding`, extension STAIRLING reprise du format pivot OCR (`STAIRLING_Format_Facture_OCR`, `numeric_encoding`). EN 16931 ne la prévoit pas : la norme écrit des décimaux. Une seule valeur est admise : `scaled_integer` à l'échelle 2. Les montants sont en centimes (`3990` = 39,90 €) ; les taux sont multipliés par 100 (`2000` = 20 %, `1000` = 10 %, `550` = 5,5 %) ; valeur = entier ÷ 100. Aucun nombre à virgule flottante. Vers un tiers (logiciel comptable, plateforme agréée), les valeurs sont converties en décimal.

```json
"numeric_encoding": { "representation": "scaled_integer", "scale": 2 }
```

## 4. Détail des blocs

### 4.1 Identification

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `statut` | enum | — | Oui | Cycle de vie de la facture : `RECU`, `VALIDE` (contrôlée, en attente de comptabilisation), `REJETE`, `COMPTABILISE` (enregistrée dans le journal de vente), `REMPLACE`. Un changement de statut = un nouvel événement `FACTURE_VENTE` avec le même `document_id` (enveloppe) et le même contenu ; seuls `statut`, `controle`, `motif` et `ecriture` changent (voir `STAIRLING_Controle_Facture_v001.md` et `STAIRLING_Processus_Traitement_Facture_Vente_v002.md`) |
| `ecriture` | objet | — | Si `COMPTABILISE` | Lien vers l'écriture journalière : `event_id` (de l'`ECRITURE_COMPTABILISEE`), `journal`, `ecriture_num`, `ecriture_date` |
| `controle` | objet | — | Si `VALIDE` ou `REJETE` | Rapport du contrôle : `run_id`, `executed_at`, `rules_version`, `checks[]` (règle, niveau, gravité, résultat, attendu, trouvé, écart) |
| `motif` | chaîne | — | Si `REJETE` | Résumé lisible des règles bloquantes en échec |
| `plateforme` | enum | — | Oui | `UBER`, `BOLT`, `HEETCH`, `FREENOW` ; désigne aussi le mandataire émetteur |
| `number` | chaîne | BT-1 | Oui | Numéro attribué par la plateforme |
| `issue_date` | date | BT-2 | Oui | Date d'émission (`AAAA-MM-JJ`) |
| `type_code` | enum | BT-3 | Oui | `380` facture, `381` avoir, `384` facture rectificative |
| `preceding_invoice_number` | chaîne | BT-25 | Si `381` ou `384` | Numéro de la facture d'origine |
| `course_ids` | tableau de chaînes | — | Oui (≥ 1) | Courses couvertes par la facture (`<PLATEFORME>-<id>`) |

### 4.1 bis Dates : émission et exécution

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `issue_date` | date | BT-2 | Oui | Date d'**émission** de la facture (rappel, §4.1) |
| `delivery_date` | date | BT-72 | Si une seule course | Date d'**exécution** de la prestation : le jour de la course |
| `invoicing_period.start_date` | date | BT-73 | Si plusieurs courses | Premier jour de la période facturée |
| `invoicing_period.end_date` | date | BT-74 | Si plusieurs courses | Dernier jour de la période facturée |

L'un des deux, `delivery_date` ou `invoicing_period`, est obligatoire : la date de la prestation doit figurer sur la facture quand elle diffère de la date d'émission.

**Dans l'Event Store** : l'événement `FACTURE_VENTE` a pour `occurred_at` la date d'émission ; les faits `CA_BRUT` et `TVA_COLLECTEE` ont pour `occurred_at` la date de la course (date d'exécution). C'est la date d'exécution qui place le chiffre d'affaires dans le bon jour du JV et le bon mois de la fiche de liaison, même si la facture est émise plus tard.

### 4.2 `seller` — vendeur

Mentions du vendeur imprimées sur la facture. Mêmes champs que le bloc `seller` de `FACTURE_ACHAT`. Ce bloc remplace `seller_siren` : le SIREN seul ne permettait pas de contrôler les mentions obligatoires d'une facture émise sous mandat au nom de Stairling.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-27 | Oui | Raison sociale : `STAIRLING UNION`, ou nom du chauffeur vendeur |
| `siren` | chaîne (9 chiffres) | BT-30 (schéma 0002) | Oui | SIREN du vendeur tel qu'il figure sur la facture : Stairling Union (`928978279`) ou un chauffeur de la coopérative. Sert au contrôle `STAIRLING-DIRECTION` |
| `siret` | chaîne (14 chiffres) | BT-29 (schéma 0225) | Non | SIRET de l'établissement |
| `vat_identifier` | chaîne | BT-31 | Si une ligne est `S` | Numéro de TVA intracommunautaire (BR-S-02) ; contrôlé par `STAIRLING-TVA-VENDEUR` |
| `address_line1` | chaîne | BT-35 | Non | Adresse |
| `post_code` | chaîne | BT-38 | Non | Code postal |
| `city` | chaîne | BT-37 | Non | Ville |
| `country_code` | chaîne (2 lettres) | BT-40 | Oui | Code pays ISO 3166 |

**Données personnelles** : pour Stairling Union, aucune contrainte. Pour un chauffeur vendeur en nom propre, nom et adresse sont des données personnelles écrites dans un store immuable : point à valider.

### 4.3 `buyer` — acheteur

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `buyer_type` | enum | — | Oui | `B2C` (particulier) ou `B2B` (professionnel) |
| `name` | chaîne | BT-44 | Si B2B | Raison sociale |
| `siren` | chaîne (9 chiffres) | BT-47 | Si B2B | SIREN de l'acheteur |
| `vat_identifier` | chaîne | BT-48 | Non | Numéro de TVA intracommunautaire |
| `address_line1` | chaîne | BT-50 | Non | Adresse |
| `post_code` | chaîne | BT-53 | Non | Code postal |
| `city` | chaîne | BT-52 | Non | Ville |
| `country_code` | chaîne (2 lettres) | BT-55 | Oui | Code pays ISO 3166 |

**Données personnelles** : l'Event Store est immuable. Pour un acheteur `B2C`, seuls `buyer_type` et `country_code` sont écrits dans l'événement ; nom et adresse restent dans la table `documents` (JSON pivot), purgeable à la fin de la conservation légale.

### 4.4 `lines` — lignes de la facture

Mêmes champs que les lignes de `FACTURE_ACHAT` ; seule la liste des catégories change.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `line_id` | chaîne | BT-126 | Oui | Identifiant de la ligne sur la facture |
| `name` | chaîne | BT-153 | Oui | Libellé de la prestation (ex. « Prix du service de transport ») |
| `net_amount` | entier (centimes) | BT-131 | Oui | Montant HT net de la ligne |
| `vat_category_code` | enum | BT-151 | Oui | Catégorie TVA de la ligne : `S`, `AE`, `O`, `E`, `Z` |
| `vat_rate` | entier (échelle 2) | BT-152 | Oui | Taux de la ligne (`1000` = 10 %) ; `0` pour `O`, `E`, `Z` |
| `category` | enum | Classification Stairling | Oui | Catégorie de revenu (liste ci-dessous) |

Catégories de vente, reprises de `stairling:classification` du format pivot : `COURSE`, `SUPPLEMENT_COURSE`, `FRAIS_ANNULATION`, `PRIME_PLATEFORME`, `POURBOIRE` (à ajouter à la liste STAIRLING, point à valider), `AUTRE` (revue humaine obligatoire).

Quantité et prix unitaire ne sont pas repris : ils restent dans le JSON pivot (table `documents`). Remises et frais globaux (code promo, frais de réservation) ne sont pas des lignes : leurs montants sont portés par `totals` (BT-107, BT-108) et imputés sur l'entrée de `vat_break_down` de leur taux.

### 4.5 `vat_break_down` — ventilation TVA

Une entrée par couple catégorie × taux. Une remise ou un frais global porte son propre taux et s'impute sur l'entrée correspondante.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `vat_category_code` | enum | BT-118 | Oui | `S` taux normal ou réduit, `AE` autoliquidation, `O` hors champ, `E` exonéré, `Z` taux zéro |
| `vat_rate` | entier (échelle 2) | BT-119 | Oui | `1000` = 10 %, `2000` = 20 %, `0` pour `O`, `E`, `Z` |
| `taxable_amount` | entier (centimes) | BT-116 | Oui | Base HT du taux = lignes − remises + frais de ce taux |
| `tax_amount` | entier (centimes) | BT-117 | Oui | TVA du taux = base × taux, arrondie au centime ; `0` pour `O`, `E`, `Z` |

Un taux à 0 n'est jamais lu seul : `O` (hors champ, absent de la CA3), `E` (exonéré, déclaré en CA3) et `Z` se distinguent par `vat_category_code`.

### 4.6 `totals` — sous-totaux

| Champ | Type | Norme | Obligatoire | Description | Calcul |
|---|---|---|---|---|---|
| `sum_invoice_lines_amount` | entier (centimes) | BT-106 | Oui | Somme des montants HT nets des lignes | Σ `lines.net_amount` |
| `sum_allowances_amount` | entier (centimes) | BT-107 | Non | Remises globales (niveau facture) | Σ remises |
| `sum_charges_amount` | entier (centimes) | BT-108 | Non | Frais globaux (niveau facture) | Σ frais |
| `total_without_vat` | entier (centimes) | BT-109 | Oui | Total HT | BT-106 − BT-107 + BT-108 |
| `total_vat_amount` | entier (centimes) | BT-110 | Oui | Total TVA | Σ `tax_amount` |
| `total_with_vat` | entier (centimes) | BT-112 | Oui | Total TTC | BT-109 + BT-110 |
| `amount_due_for_payment` | entier (centimes) | BT-115 | Oui | Montant à payer | BT-112 − montant déjà payé (BT-113) ; sans paiement déjà imputé : BT-112 |

`sum_invoice_lines_amount` est la somme brute des lignes ; `total_without_vat` est le vrai total HT, après remises et frais globaux. Les deux sont égaux en l'absence de remise et de frais globaux.

## 5. Contrôles à la validation

| Règle | Contrôle |
|---|---|
| BR-CO-10 | `sum_invoice_lines_amount` = Σ `lines.net_amount` |
| BR-CO-13 | `total_without_vat` = `sum_invoice_lines_amount` − `sum_allowances_amount` + `sum_charges_amount` |
| BR-S-08 | Pour chaque entrée `S` : `taxable_amount` = Σ lignes de ce taux − remises + frais de ce taux |
| Somme des bases | Σ `vat_break_down.taxable_amount` = `total_without_vat` |
| BR-CO-14 | Σ `vat_break_down.tax_amount` = `total_vat_amount` |
| BR-CO-15 | `total_with_vat` = `total_without_vat` + `total_vat_amount` |
| BR-S-09 | Pour chaque entrée `S` : `tax_amount` = `taxable_amount` × `vat_rate`, arrondi au centime |
| BR-CO-16 | `amount_due_for_payment` = `total_with_vat` − montant déjà payé (0 si aucun) |
| STAIRLING-CLASSIFICATION | Chaque ligne a une `category` de vente ; `AUTRE` bloque la validation jusqu'à revue humaine |
| STAIRLING-COURSE-SUM | Par taux, `vat_break_down` = somme des faits `CA_BRUT` / `TVA_COLLECTEE` des `course_ids` |
| STAIRLING-DATES | `delivery_date` ou `invoicing_period` présent ; `start_date` ≤ `end_date` ; la date d'exécution (ou la période) n'est pas postérieure à `issue_date` ; les dates des `course_ids` tombent à `delivery_date` ou dans la période |
| STAIRLING-DIRECTION | `seller.siren` = SIREN de Stairling Union, ou SIREN d'un chauffeur de la coopérative avec `plateforme` émettrice sous mandat ; sinon la pièce n'est pas une vente de Stairling |
| STAIRLING-TVA-VENDEUR | Si une ligne est `S` : `seller.vat_identifier` présent (BR-S-02) et égal au numéro de TVA de Stairling Union (`FR10928978279`) ou du chauffeur vendeur ; gravité proposée : avertissement |
| STAIRLING-AVOIR | Pour `AVOIR_VENTE` : `type_code` = `381` et `preceding_invoice_number` renseigné ; pour `FACTURE_VENTE` : `type_code` ≠ `381` |

Tous les contrôles passent : nouvel événement au statut `VALIDE`. Un contrôle échoue : statut `REJETE` avec l'écart par taux, aucune écriture produite.

## 6. Exemple

Facture à trois taux, client professionnel (acheteur fictif) :

| Élément | HT | Catégorie / taux |
|---|---|---|
| Ligne : course | 30,00 | S / 10 % |
| Ligne : supplément nettoyage | 5,00 | S / 20 % |
| Ligne : pourboire | 3,00 | O / hors champ |
| Remise globale : code promo | − 3,00 | S / 10 % |
| Frais globaux : réservation | + 1,00 | S / 20 % |

```json
{
  "numeric_encoding": { "representation": "scaled_integer", "scale": 2 },
  "statut": "RECU",
  "plateforme": "UBER",
  "number": "UBER-FR-2026-118204",
  "issue_date": "2026-11-07",
  "delivery_date": "2026-11-07",
  "type_code": "380",
  "course_ids": ["UBER-8841"],
  "seller": {
    "name": "STAIRLING UNION",
    "siren": "928978279",
    "vat_identifier": "FR10928978279",
    "address_line1": "5 RUE Pleyel",
    "post_code": "93200",
    "city": "Saint-Denis",
    "country_code": "FR"
  },
  "buyer": {
    "buyer_type": "B2B",
    "name": "Exemple Conseil SAS",
    "siren": "123456782",
    "vat_identifier": "FR11123456782",
    "address_line1": "10 rue de l'Exemple",
    "post_code": "75008",
    "city": "Paris",
    "country_code": "FR"
  },
  "lines": [
    { "line_id": "1", "name": "Prix du service de transport", "net_amount": 3000, "vat_category_code": "S", "vat_rate": 1000, "category": "COURSE" },
    { "line_id": "2", "name": "Supplément nettoyage", "net_amount": 500, "vat_category_code": "S", "vat_rate": 2000, "category": "SUPPLEMENT_COURSE" },
    { "line_id": "3", "name": "Pourboire", "net_amount": 300, "vat_category_code": "O", "vat_rate": 0, "category": "POURBOIRE" }
  ],
  "vat_break_down": [
    { "vat_category_code": "S", "vat_rate": 1000, "taxable_amount": 2700, "tax_amount": 270 },
    { "vat_category_code": "S", "vat_rate": 2000, "taxable_amount": 600,  "tax_amount": 120 },
    { "vat_category_code": "O", "vat_rate": 0,    "taxable_amount": 300,  "tax_amount": 0 }
  ],
  "totals": {
    "sum_invoice_lines_amount": 3800,
    "sum_allowances_amount": 300,
    "sum_charges_amount": 100,
    "total_without_vat": 3600,
    "total_vat_amount": 390,
    "total_with_vat": 3990,
    "amount_due_for_payment": 3990
  },
  "sha256": "…"
}
```

Dates : course effectuée et facture émise le 7 novembre (`delivery_date` = `issue_date`) ; les faits `CA_BRUT` et `TVA_COLLECTEE` sont datés du 7. La facture, récupérée le jour même, est comptabilisée au traitement de J+1. Si la course avait eu lieu le 6, `delivery_date` vaudrait `2026-11-06` et la facture, récupérée le 7, irait à la régularisation du 10.

Pour un relevé couvrant plusieurs courses, `delivery_date` est remplacé par :

```json
"invoicing_period": { "start_date": "2026-11-02", "end_date": "2026-11-08" }
```

Contrôles : 3000 + 500 + 300 = 3800 (BR-CO-10) ; 3800 − 300 + 100 = 3600 (BR-CO-13) ; 3000 − 300 = 2700 à 10 % et 500 + 100 = 600 à 20 % (BR-S-08) ; 2700 + 600 + 300 = 3600 ; 270 + 120 + 0 = 390 (BR-CO-14) ; 3600 + 390 = 3990 (BR-CO-15) ; 3990 − 0 = 3990 (BR-CO-16).

Faits produits à la validation : 3 `CA_BRUT` (un par entrée de ventilation) et 2 `TVA_COLLECTEE` (aucun pour la catégorie `O`).

## 7. Schéma JSON

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:stairling:event:FACTURE_VENTE:1",
  "type": "object",
  "required": ["numeric_encoding", "statut", "plateforme", "seller", "number", "issue_date", "type_code",
               "course_ids", "buyer", "lines", "vat_break_down", "totals", "sha256"],
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
    "statut":       { "enum": ["RECU", "VALIDE", "REJETE", "COMPTABILISE", "REMPLACE"] },
    "ecriture": {
      "type": "object",
      "description": "Lien vers l'écriture du journal de vente (statut COMPTABILISE)",
      "required": ["event_id", "journal", "ecriture_date"],
      "properties": {
        "event_id":      { "type": "string", "format": "uuid", "description": "event_id de l'ECRITURE_COMPTABILISEE" },
        "journal":       { "type": "string", "examples": ["VT-UBER"] },
        "ecriture_num":  { "type": "string" },
        "ecriture_date": { "type": "string", "format": "date" }
      }
    },
    "plateforme":   { "$ref": "#/$defs/Plateforme" },
    "controle":     { "$ref": "#/$defs/RapportControle" },
    "motif":        { "type": "string", "description": "Obligatoire si statut = REJETE" },
    "number":     { "type": "string", "description": "BT-1" },
    "issue_date": { "type": "string", "format": "date", "description": "BT-2" },
    "type_code":  { "enum": ["380", "381", "384"], "description": "BT-3" },
    "preceding_invoice_number": { "type": "string", "description": "BT-25, obligatoire pour 381 et 384" },
    "course_ids": { "type": "array", "items": { "type": "string" }, "minItems": 1 },

    "delivery_date": { "type": "string", "format": "date", "description": "BT-72, date d'exécution (une course)" },
    "invoicing_period": {
      "type": "object",
      "description": "BG-14, période facturée (plusieurs courses)",
      "required": ["start_date", "end_date"],
      "properties": {
        "start_date": { "type": "string", "format": "date", "description": "BT-73" },
        "end_date":   { "type": "string", "format": "date", "description": "BT-74" }
      }
    },

    "seller": {
      "type": "object",
      "description": "BG-4 / BG-5, Stairling ou chauffeur de la coopérative",
      "required": ["name", "siren", "country_code"],
      "properties": {
        "name":           { "type": "string", "description": "BT-27" },
        "siren":          { "type": "string", "pattern": "^[0-9]{9}$", "description": "BT-30" },
        "siret":          { "type": "string", "pattern": "^[0-9]{14}$", "description": "BT-29" },
        "vat_identifier": { "type": "string", "description": "BT-31, requis si une ligne est S (contrôle STAIRLING-TVA-VENDEUR)" },
        "address_line1":  { "type": "string", "description": "BT-35" },
        "post_code":      { "type": "string", "description": "BT-38" },
        "city":           { "type": "string", "description": "BT-37" },
        "country_code":   { "type": "string", "pattern": "^[A-Z]{2}$", "description": "BT-40" }
      }
    },

    "buyer": {
      "type": "object",
      "description": "BG-7 / BG-8",
      "required": ["buyer_type", "country_code"],
      "properties": {
        "buyer_type":     { "enum": ["B2C", "B2B"] },
        "name":           { "type": "string", "description": "BT-44" },
        "siren":          { "type": "string", "pattern": "^[0-9]{9}$", "description": "BT-47" },
        "vat_identifier": { "type": "string", "description": "BT-48" },
        "address_line1":  { "type": "string", "description": "BT-50" },
        "post_code":      { "type": "string", "description": "BT-53" },
        "city":           { "type": "string", "description": "BT-52" },
        "country_code":   { "type": "string", "pattern": "^[A-Z]{2}$", "description": "BT-55" }
      },
      "if":   { "properties": { "buyer_type": { "const": "B2B" } } },
      "then": { "required": ["name", "siren"] }
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
          "category":          { "$ref": "#/$defs/CategorieVente" }
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

  "anyOf": [
    { "required": ["delivery_date"] },
    { "required": ["invoicing_period"] }
  ],

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
    "Taux":         { "type": "integer", "description": "Scale 2 : 1000 = 10,00 %" },
    "Plateforme":   { "enum": ["UBER", "BOLT", "HEETCH", "FREENOW"] },
    "CategorieTVA": { "enum": ["S", "AE", "O", "E", "Z"], "description": "EN 16931 BT-118" },
    "CategorieVente": {
      "enum": ["COURSE", "SUPPLEMENT_COURSE", "FRAIS_ANNULATION", "PRIME_PLATEFORME", "POURBOIRE", "AUTRE"],
      "description": "Classification Stairling, catégories de vente ; POURBOIRE à ajouter à la liste STAIRLING"
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
