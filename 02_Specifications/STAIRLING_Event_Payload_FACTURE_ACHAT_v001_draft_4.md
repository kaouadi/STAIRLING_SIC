# STAIRLING — Payload de l'événement `FACTURE_ACHAT`

| | |
|---|---|
| Document | Description de l'événement `FACTURE_ACHAT` / `AVOIR_ACHAT` de l'Event Store : enveloppe et payload (fiche de liaison) |
| Version | v001 draft 4 — 10 novembre 2026. Remplace la v001 initiale (archivée dans `_arch/`). Refonte du payload : il contient un bloc `invoice` à la structure EN 16931 (reprise du format pivot OCR) et un bloc `stairling` pour les données hors norme ; enveloppe enrichie (`tenant_id`, `invoice_key`, `idempotency_key`, `event_id` déterministe, `correlation_id`, `integrity`) ; catégorie portée sur la ligne (`invoice.lines[].category`) |
| Version du payload | `schema_version` = `3` (schéma `urn:stairling:event:FACTURE_ACHAT:3`). Numérotation distincte de celle de la fiche, voir §3.1 |
| Auteur | AOUADI Karim |
| Rattachement | Format pivot `urn:stairling:ocr-invoice` (`OCR/STAIRLING_Format_Facture_OCR_v001_draft_16.docx`, schéma `OCR/STAIRLING_Format_Facture_OCR_invoice_v001.schema.json`) ; payload `FACTURE_VENTE` v001 draft 4 ; `STAIRLING_Controle_Facture_v001_draft_2.md` ; proposition de mise à jour de l'Event Store, §5.3, §5.4, §11.2 |
| Norme | EN 16931 (`urn:cen.eu:en16931:2017`) |
| Exemple de référence | `STAIRLING_Event_FACTURE_ACHAT_exemple_T-0482_v001_draft_4.json` |

## 1. Objet

L'événement `FACTURE_ACHAT` enregistre dans l'Event Store une facture ou un ticket d'achat reçu par Stairling Union pour l'activité d'un entrepreneur-salarié (carburant, péage, entretien…). La pièce arrive par l'extraction OCR (format pivot) ou directement d'un fournisseur.

L'événement `AVOIR_ACHAT` utilise le même payload, avec `invoice.type_code` = `381` et `invoice.preceding_invoice_references` renseigné. Le sens (achat) est porté par le type d'événement : `FACTURE_ACHAT` et `AVOIR_ACHAT` d'un côté, `FACTURE_VENTE` et `AVOIR_VENTE` de l'autre.

**Principe du draft 4.** Le payload sépare ce qui relève de la facture de ce qui relève de STAIRLING :

- `invoice` reprend le bloc `invoice` du format pivot, avec les mêmes noms de champs et la même structure (sérialisation `en_invoice` de l'EN 16931). Un seul ajout : `category` sur chaque ligne ;
- `stairling` contient les données que la norme ne prévoit pas : rattachement à l'entrepreneur, empreinte du fichier source ;
- à la racine restent les champs du cycle de vie : `statut`, `controle`, `motif`, `ecriture`, `previous_document_id`.

**Ce que le payload n'est pas.** Il n'est pas une facture EN 16931 transmissible telle quelle : les nombres sont des entiers à l'échelle 2, la ligne porte un champ `category`, et l'acheteur peut manquer (§5.4). La facture transmise à un tiers est produite à l'export (§9).

**Différences avec `FACTURE_VENTE`** :

- l'acheteur est toujours Stairling Union : `invoice.buyer` n'est présent que si la pièce l'imprime ;
- `invoice.seller` désigne le fournisseur, et non Stairling ;
- la `category` de chaque ligne est une catégorie de dépense, qui commande la déductibilité de la TVA ;
- `invoice.totals.paid_amount` et `amount_due_for_payment` alimentent `PAIEMENT_FOURNISSEUR` ;
- `stairling` n'a ni `plateforme`, ni `activity_ids`, ni `principal`.

## 2. Structure de l'événement

```
FACTURE_ACHAT / AVOIR_ACHAT
├─ enveloppe        seq, event_id, tenant_id, stream_id, stream_version, event_type,
│                   schema_version, occurred_at, recorded_at, document_id,
│                   invoice_key, idempotency_key, correlation_id, causation_id, actor,
│                   integrity {canonicalization, algorithm, chain_scope,
│                              payload_hash, prev_hash, hash}
└─ payload
   ├─ numeric_encoding   representation = scaled_integer, scale = 2
   ├─ statut, controle, motif, ecriture, previous_document_id      (cycle de vie)
   ├─ invoice                                                      (structure EN 16931)
   │  ├─ number, issue_date, type_code, currency_code
   │  ├─ delivery_date | invoicing_period {start_date, end_date}
   │  ├─ preceding_invoice_references [ {reference, issue_date} ]  (avoir, rectificative)
   │  ├─ process_control {specification_identifier}
   │  ├─ notes [ {note} ]
   │  ├─ seller   {name, legal_registration_identifier, identifiers[], vat_identifier, postal_address}
   │  ├─ buyer    {name, legal_registration_identifier, vat_identifier, postal_address}   (si imprimé)
   │  ├─ payment_instructions {payment_means_type_code}
   │  ├─ lines [ {identifier, invoiced_quantity, invoiced_quantity_code, net_amount,
   │  │           price_details, item_information, category, vat_information}, … ]
   │  ├─ vat_break_down [ {vat_category_code, vat_category_rate, vat_category_taxable_amount,
   │  │                    vat_category_tax_amount, vat_exemption_reason_code, vat_exemption_reason}, … ]
   │  └─ totals {sum_invoice_lines_amount, sum_allowances_amount, sum_charges_amount,
   │             total_without_vat, total_vat_amount {value, currency_code},
   │             total_with_vat, paid_amount, amount_due_for_payment}
   └─ stairling                                                    (hors norme)
      ├─ rattachement {worker_id, person_uuid, link_method}
      ├─ pivot {format, format_version}
      └─ source {sha256, media_type, file_name, page_count}
```

## 3. Enveloppe

L'enveloppe décrit l'**enregistrement** de l'événement ; le payload décrit la **pièce**. Une donnée qui sert à ranger, tracer ou sécuriser l'événement va dans l'enveloppe, jamais dans le payload : le hash du payload ne doit pas dépendre de métadonnées techniques.

| Champ | Type | Nouveau draft 4 | Obligatoire | Description |
|---|---|---|---|---|
| `seq` | entier | — | Oui | Position de l'événement dans la séquence **du tenant**, attribuée à l'écriture (pas de séquence globale). Unique par (`tenant_id`, `seq`), sans trou ; c'est l'ordre de la chaîne de hash. Calcul : §3.2 |
| `event_id` | UUID | règle | Oui | **UUID v5** calculé à partir de `idempotency_key`. Rejouer le même événement redonne le même `event_id` ; la contrainte d'unicité refuse le doublon. Un changement de statut donne un nouvel `event_id` |
| `tenant_id` | chaîne | ✅ | Oui | Tenant de rattachement ; même valeur que `stairling:routing.tenant_id` du format pivot (`stairling-union`) |
| `stream_id` | chaîne | — | Oui | Flux de l'entrepreneur : **un flux par entrepreneur**, identifié par son `worker_id` (`ES-0042`). Unique dans le tenant. Frais de structure de la coopérative : flux `STAIRLING` (à confirmer, voir §11) |
| `stream_version` | entier | — | Oui | Numéro de l'événement dans le flux de l'entrepreneur (1, 2, 3…). Unique par (`tenant_id`, `stream_id`, `stream_version`) ; sert au contrôle de concurrence optimiste : l'écriture échoue si la version attendue n'est plus la dernière. Calcul : §3.2 |
| `event_type` | enum | — | Oui | `FACTURE_ACHAT` ou `AVOIR_ACHAT` |
| `schema_version` | entier | — | Oui | Version du schéma du payload : `3` pour le payload décrit ici. Voir §3.1 |
| `occurred_at` | date-heure | — | Oui | Date d'émission de la pièce (`invoice.issue_date`, à minuit UTC) |
| `recorded_at` | date-heure | — | Oui | Date d'enregistrement dans l'Event Store |
| `document_id` | UUID | — | Oui | Identifiant du document pivot (table `documents`) ; identique pour tous les statuts d'une même pièce |
| `invoice_key` | chaîne | ✅ | Oui | **Identité métier de la pièce**, la même sur tous ses événements (tous statuts, toutes corrections) : `tenant_id` \| SIREN du vendeur (BT-30) \| numéro (BT-1) \| type (BT-3). Ex. `stairling-union|123456782|T-0482|380`. Le numéro seul ne suffit pas : la norme ne le garantit unique que par vendeur. Sans SIREN vendeur lisible, on utilise le numéro de TVA (BT-31), à défaut `document_id`. Un avoir (`381`) a sa propre clé |
| `idempotency_key` | chaîne | ✅ | Oui | **Anti-doublon** : `invoice_key` \| `payload.statut`. Ex. `stairling-union|123456782|T-0482|380|RECU`. Unique dans l'Event Store : un même changement d'état n'est enregistré qu'une fois |
| `correlation_id` | UUID | ✅ | Oui | Identique sur toute la chaîne de traitement d'une pièce (`RECU` → `VALIDE` → `COMPTABILISE`, écriture, paiement). UUID v5 calculé à partir de `invoice_key` (`"correlation|" + invoice_key`) : il ne change pas quand une pièce corrigée reçoit un nouveau `document_id`. Les événements liés (écriture, paiement) reprennent le `correlation_id` de la pièce |
| `causation_id` | UUID ou `null` | — | Oui | `event_id` de l'événement qui a provoqué celui-ci ; `null` pour le `RECU` |
| `actor` | chaîne | — | Oui | Origine : `ocr-engine`, `api:<fournisseur>`, `user:<id>` |
| `integrity` | objet | ✅ | Oui | Chaîne de hash, voir ci-dessous |

**`integrity`** — chaîne de hash :

| Champ | Description |
|---|---|
| `canonicalization` | `JCS-RFC8785` : forme canonique du JSON (clés triées, sans espace, nombres normalisés) avant tout calcul de hash |
| `algorithm` | `sha256` |
| `chain_scope` | `tenant` : une chaîne par tenant, dans l'ordre de `seq` (séquence du tenant) |
| `payload_hash` | sha256 du payload sous forme canonique |
| `prev_hash` | `hash` de l'événement précédent de la même chaîne |
| `hash` | sha256 de la forme canonique de l'objet { `event_id`, `tenant_id`, `stream_id`, `stream_version`, `event_type`, `schema_version`, `recorded_at`, `prev_hash`, `payload_hash` }. `schema_version` est inclus : la version déclarée ne peut pas être modifiée sans casser la chaîne |

Le hash est calculé sur le payload avec ses entiers à l'échelle 2 : la conversion en décimal pour un tiers ne change pas le hash. `integrity` n'est pas `payload.stairling.source.sha256` : ce dernier est l'empreinte du **fichier d'origine** (photo, PDF).

**Suivre une pièce.** Tous les événements d'une pièce ont la même `invoice_key` et le même `correlation_id`. L'état courant est celui du dernier événement par `seq` :

```sql
SELECT seq, stream_version, event_type, payload->>'statut' AS statut, event_id, causation_id
FROM events
WHERE tenant_id = 'stairling-union'
  AND correlation_id = :correlation_id
ORDER BY seq;
```

| Identifiant | Désigne | Change |
|---|---|---|
| `invoice_key` | la pièce (clé métier lisible) | jamais |
| `correlation_id` | la pièce et ses suites (écriture, paiement) | jamais |
| `document_id` | une version extraite de la pièce | à chaque correction |
| `idempotency_key` / `event_id` | un changement d'état | à chaque statut |
| `causation_id` | l'événement déclencheur | à chaque événement |

Exemple complet du cycle RECU → VALIDE → COMPTABILISE : `STAIRLING_Event_FACTURE_ACHAT_exemple_cycle_1200_v001_draft_4.json`.

**Espace de noms des UUID v5** : à fixer par STAIRLING. Les exemples utilisent `uuid5(NAMESPACE_URL, "urn:stairling:event-store")`.

### 3.1 Versionnement du payload

**Deux numéros distincts.**

| Numéro | Où | Valeur actuelle | Change quand… |
|---|---|---|---|
| Version de la fiche | Cartouche | `v001 draft 4` | le texte de la fiche change (clarification, exemple, correction), même sans effet sur le payload |
| Version du schéma du payload | Enveloppe, `schema_version` | `3` | la structure ou le sens du payload change |

Les deux numérotations sont indépendantes : la fiche v001 draft 4 décrit le schéma 3. Un prochain draft 5 qui ne ferait que corriger le texte resterait au schéma 3.

**Identifiant du schéma.** Le schéma JSON de validation se déduit de l'enveloppe : `urn:stairling:event:FACTURE_ACHAT:{schema_version}`, soit `urn:stairling:event:FACTURE_ACHAT:3` (§10). Le même schéma sert pour `FACTURE_ACHAT` et `AVOIR_ACHAT`. Aucun champ supplémentaire n'est nécessaire dans l'enveloppe ni dans le payload.

**Historique.**

| `schema_version` | Description | Référence |
|---|---|---|
| `1` | Payload à plat (`seller.city`, `delivery_date`, `preceding_invoice_number`), nombres entiers à l'échelle 2 | `_arch/STAIRLING_Event_Payload_FACTURE_ACHAT_v001.md` |
| `2` | Payload à plat enrichi (rattachement, idempotence), étape de travail, jamais publiée dans une fiche | `_arch/STAIRLING_Event_FACTURE_ACHAT_exemple_T-0482_v001.json`, `_v002.json` |
| `3` | Payload structuré : `invoice` à la structure EN 16931, `stairling` hors norme, `category` sur la ligne, enveloppe enrichie | Cette fiche (v001 draft 4) |

**Règles de changement.**

- On **incrémente** `schema_version` pour : un champ ajouté, renommé, déplacé ou supprimé ; un changement de type ou d'encodage (ex. `numeric_encoding`) ; une nouvelle valeur d'énumération (`category`, `statut`, `link_method`) ; un changement de sens d'un champ existant.
- On **n'incrémente pas** pour : une correction de texte, un nouvel exemple, une précision de contrôle sans effet sur la structure.
- Un nouveau schéma reçoit un nouvel identifiant (`…:4`). Le schéma `…:3` n'est jamais modifié une fois publié.

**Événements anciens.** L'Event Store est en ajout seul et chaîné par hash : un événement enregistré en version 1 ou 2 n'est **jamais réécrit**. Le lecteur (projection, export, contrôle) lit `schema_version` puis :
- valide l'événement avec le schéma de sa version ;
- le convertit à la volée vers la version courante (« upcasting ») avant traitement. Une fonction de conversion par saut de version : 1 → 2, 2 → 3.

Un événement dont la `schema_version` n'a pas de schéma connu est refusé à l'écriture et signalé à la lecture.

### 3.2 Écriture d'un événement : `stream_version`, `seq` et concurrence

`stream_version`, `seq`, `prev_hash` et `hash` ne viennent pas de la source (OCR, plateforme) : ils sont **calculés par le programme qui écrit l'événement**, dans une seule transaction.

**Procédure**

1. **Idempotence** : calculer `idempotency_key` ; si un événement porte déjà cette clé, ne rien écrire et renvoyer l'événement existant (STAIRLING-IDEMPOTENCE).
2. **Lire la version attendue** du flux de l'entrepreneur : dernière `stream_version` de (`tenant_id`, `stream_id`), `0` si le flux est vide.
3. **Décider** : rejouer ou lire l'état de l'entrepreneur, appliquer les règles métier.
4. **Écrire** dans une transaction :
   - verrouiller la chaîne du tenant ;
   - `stream_version` = version attendue + 1 ;
   - `seq` = dernier `seq` du tenant + 1 ;
   - `prev_hash` = `hash` de l'événement de `seq` précédent du tenant ;
   - `payload_hash` puis `hash` (§3, `integrity`) ;
   - insérer l'événement.
5. **Conflit** : si (`tenant_id`, `stream_id`, `stream_version`) existe déjà, un autre traitement a écrit entre l'étape 2 et l'étape 4. Annuler la transaction et reprendre à l'étape 1. Au-delà de 3 tentatives, l'erreur est signalée.

Le premier événement d'un flux a `stream_version` = `1`.

**Contraintes en base (PostgreSQL)**

```sql
ALTER TABLE events ADD CONSTRAINT uq_stream_version UNIQUE (tenant_id, stream_id, stream_version);
ALTER TABLE events ADD CONSTRAINT uq_tenant_seq      UNIQUE (tenant_id, seq);
ALTER TABLE events ADD CONSTRAINT uq_idempotency     UNIQUE (tenant_id, idempotency_key);
ALTER TABLE events ADD CONSTRAINT uq_event_id        UNIQUE (event_id);
```

**Mise en œuvre recommandée : table des flux et table des chaînes**

```sql
-- Dernière version de chaque flux d'entrepreneur
CREATE TABLE streams (
  tenant_id text, stream_id text, version integer NOT NULL,
  PRIMARY KEY (tenant_id, stream_id)
);
-- Dernier seq et dernier hash de chaque tenant
CREATE TABLE tenant_chains (
  tenant_id text PRIMARY KEY, last_seq bigint NOT NULL, last_hash text NOT NULL
);

BEGIN;
  -- Verrou de la chaîne du tenant (les écritures d'un tenant passent l'une après l'autre)
  SELECT last_seq, last_hash FROM tenant_chains
  WHERE tenant_id = :tenant FOR UPDATE;

  -- Contrôle de concurrence optimiste sur le flux
  UPDATE streams SET version = :expected + 1
  WHERE tenant_id = :tenant AND stream_id = :stream AND version = :expected;
  -- 0 ligne modifiée → conflit : ROLLBACK et reprise (étape 5)
  -- flux nouveau (expected = 0) : INSERT INTO streams … VALUES (…, 1)

  INSERT INTO events (seq, tenant_id, stream_id, stream_version, event_id, …, integrity, payload)
  VALUES (:last_seq + 1, :tenant, :stream, :expected + 1, …);

  UPDATE tenant_chains SET last_seq = :last_seq + 1, last_hash = :hash
  WHERE tenant_id = :tenant;
COMMIT;
```

**Exemple**

Facture 1200 (`STAIRLING_Event_FACTURE_ACHAT_exemple_cycle_1200_v001_draft_4.json`), flux `ES-0042` :

| Étape | Version attendue | `stream_version` écrite | `seq` | Résultat |
|---|---|---|---|---|
| OCR : RECU | 11 | 12 | 1001 | accepté |
| Contrôle : VALIDE | 12 | 13 | 1004 | accepté |
| Comptabilisation : écriture | 13 | 14 | 1007 | accepté |
| Comptabilisation : COMPTABILISE | 14 | 15 | 1008 | accepté |
| *En parallèle* : dépôt d'un ticket du même chauffeur, version 14 lue avant l'étape précédente | 14 | 15 | — | **conflit** : relecture (15), écriture en 16, `seq` 1009 |

Les `seq` 1002-1003 et 1005-1006 sont des événements d'autres entrepreneurs du tenant.

**Rôle de chaque numéro**

| Numéro | Portée | Attribué par | Sert à |
|---|---|---|---|
| `stream_version` | flux de l'entrepreneur | version attendue + 1 | ordre de l'histoire de l'entrepreneur ; refus d'une décision prise sur un état périmé |
| `seq` | tenant | dernier `seq` du tenant + 1 | ordre de la chaîne de hash ; reprise des projections (« traité jusqu'à `seq` N ») |
| `event_id` | global | UUID v5 de `idempotency_key` | identité de l'événement ; refus des doublons |

La chaîne de hash étant **par tenant**, le verrou de `tenant_chains` sérialise déjà les écritures d'un tenant. Le contrôle sur `stream_version` reste nécessaire : la décision métier (étape 3) est prise **avant** le verrou, sur un état qui peut avoir changé.

## 4. Index des blocs du payload

| # | Bloc | Type | Norme EN 16931 | Obligatoire | Rôle |
|---|---|---|---|---|---|
| 0 | `numeric_encoding` | objet | — (STAIRLING) | Oui | Encodage des nombres : entiers à l'échelle 2 |
| 1 | Cycle de vie (racine) | champs simples | — | Oui | `statut`, `controle`, `motif`, `ecriture`, `previous_document_id` |
| 2 | `invoice` — identification | champs simples | BT-1, BT-2, BT-3, BT-5, BG-2 | Oui | Numéro, dates, type, devise, spécification |
| 2b | `invoice` — dates d'exécution | champ ou objet | BT-72, BG-14 | Non | Date du plein, de la réparation, ou période facturée |
| 2c | `invoice.preceding_invoice_references` | tableau | BG-3 (BT-25, BT-26) | Si `381` ou `384` | Facture d'origine d'un avoir |
| 3 | `invoice.seller` | objet | BG-4, BG-5 | Oui | Fournisseur |
| 4 | `invoice.buyer` | objet | BG-7, BG-8 | Si imprimé | Acheteur imprimé (Stairling Union) |
| 5 | `invoice.payment_instructions` | objet | BG-16 (BT-81) | Non | Moyen de paiement |
| 6 | `invoice.lines` | tableau | BG-25 + `category` | Oui, ≥ 1 | Lignes d'achat et catégorie de dépense |
| 7 | `invoice.vat_break_down` | tableau | BG-23 | Oui | Base et TVA par couple catégorie × taux |
| 8 | `invoice.totals` | objet | BG-22 | Oui | Totaux, montant payé, reste à payer |
| 9 | `stairling` | objet | — | Oui | Rattachement, empreinte du fichier source |

**Encodage numérique** : `numeric_encoding` déclare l'encodage de tous les nombres du bloc `invoice`. Une seule valeur est admise : `scaled_integer` à l'échelle 2, comme dans le format pivot.

- Montants en centimes : `5000` = 50,00 €.
- Taux × 100 : `2000` = 20 %, `550` = 5,5 %.
- Quantités × 100 : `3245` = 32,45 L.
- Une valeur plus précise que 2 décimales reste une **chaîne décimale** : prix au litre `"1.5408"`.
- Aucun nombre à virgule flottante. Vers un tiers, les valeurs sont converties en décimal (§9).

```json
"numeric_encoding": { "representation": "scaled_integer", "scale": 2 }
```

## 5. Détail des blocs

### 5.1 Cycle de vie (racine du payload)

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `statut` | enum | Oui | `RECU`, `VALIDE` (contrôlée, en attente de comptabilisation), `REJETE`, `COMPTABILISE` (enregistrée dans le journal d'achat), `REMPLACE`. Un changement de statut = un nouvel événement avec le même `document_id` et le même `invoice` ; seuls `statut`, `controle`, `motif` et `ecriture` changent |
| `controle` | objet | Si `VALIDE`, `REJETE` ou `COMPTABILISE` | Rapport du contrôle : `run_id`, `executed_at`, `rules_version`, `checks[]` (voir `STAIRLING_Controle_Facture_v001_draft_2.md` §5) |
| `motif` | chaîne | Si `REJETE` | Résumé lisible des règles bloquantes en échec |
| `ecriture` | objet | Si `COMPTABILISE` | Lien vers l'écriture : `event_id` (de l'`ECRITURE_COMPTABILISEE`), `journal`, `ecriture_num`, `ecriture_date` |
| `previous_document_id` | UUID | Si nouvelle version | `document_id` de la version remplacée (correction d'extraction OCR) |

### 5.2 `invoice` — identification et dates

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `number` | chaîne | BT-1 | Oui | Numéro de la facture ou du ticket |
| `issue_date` | date | BT-2 | Oui | Date d'**émission** (`AAAA-MM-JJ`) |
| `type_code` | enum | BT-3 | Oui | `380` facture, `381` avoir, `384` facture rectificative |
| `currency_code` | chaîne (3 lettres) | BT-5 | Oui | Devise ISO 4217 (`EUR`) |
| `delivery_date` | date | BT-72 | Non | Date de **livraison ou d'exécution** : jour du plein, de la réparation |
| `invoicing_period.start_date` | date | BT-73 | Non | Début de la période facturée (location, assurance, forfait téléphone) |
| `invoicing_period.end_date` | date | BT-74 | Non | Fin de la période facturée |
| `preceding_invoice_references[].reference` | chaîne | BT-25 | Si `381` ou `384` | Numéro de la facture d'origine |
| `preceding_invoice_references[].issue_date` | date | BT-26 | Recommandé | Date de la facture d'origine ; lève l'ambiguïté d'un numéro réutilisé |
| `process_control.specification_identifier` | chaîne | BT-24 | Oui | `urn:cen.eu:en16931:2017` |
| `notes[].note` | chaîne | BT-22 | Non | Mentions imprimées utiles (conditions, mandat…) |

`delivery_date` et `invoicing_period` ne sont jamais présents ensemble. Si aucun n'est présent, la date d'exécution est réputée égale à `issue_date`. Pour un ticket de caisse, l'OCR peut écrire explicitement `delivery_date` = `issue_date`, comme dans l'exemple §8.

**Dans l'Event Store** : l'événement a pour `occurred_at` la date d'émission ; les faits `ACHAT_HT` et `TVA_DEDUCTIBLE` ont pour `occurred_at` la date d'exécution (ou la fin de la période). Une charge couvrant une période à cheval sur deux exercices se répartit grâce à `invoicing_period` (charge constatée d'avance).

### 5.3 `invoice.seller` — fournisseur

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-27 | Oui | Raison sociale |
| `legal_registration_identifier` | `{scheme, value}` | BT-30 | Non | SIREN : `scheme` = `0002`, `value` sur 9 chiffres |
| `identifiers[]` | `{scheme, value}` | BT-29 | Non | SIRET : `scheme` = `0225`, `value` sur 14 chiffres |
| `vat_identifier` | chaîne | BT-31 | Non | Numéro de TVA intracommunautaire ; son absence fait vérifier le droit à déduction |
| `postal_address.address_line1` | chaîne | BT-35 | Non | Adresse |
| `postal_address.post_code` | chaîne | BT-38 | Non | Code postal |
| `postal_address.city` | chaîne | BT-37 | Non | Ville |
| `postal_address.country_code` | chaîne (2 lettres) | BT-40 | Oui | Code pays ISO 3166 ; hors `FR`, vérifier l'autoliquidation |

Le fournisseur est une entreprise : ses coordonnées peuvent être conservées dans l'événement sans contrainte de données personnelles.

### 5.4 `invoice.buyer` — acheteur

L'acheteur d'une pièce d'achat est toujours Stairling Union : le bloc sert au contrôle `STAIRLING-DIRECTION`.

**Règle : une valeur déduite n'est pas reprise.** Le bloc n'est écrit que si la pièce **imprime** l'acheteur. Il est absent sur un ticket de caisse non nominatif, même si le format pivot l'a déduit (`status: inferred` dans `extraction.fields`).

**Écart à la norme assumé** : BG-7 est obligatoire dans l'EN 16931. Un payload sans `buyer` n'est donc pas une facture complète ; c'est le cas normal d'un ticket de caisse, qui n'est pas une facture électronique au sens de la réforme.

| Champ | Type | Norme | Obligatoire (si `buyer`) | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-44 | Oui | Raison sociale imprimée ; doit désigner Stairling Union |
| `legal_registration_identifier` | `{scheme, value}` | BT-47 | Non | SIREN imprimé ; doit valoir `0002` / `928978279` |
| `vat_identifier` | chaîne | BT-48 | Non | Numéro de TVA imprimé ; doit valoir `FR10928978279` |
| `postal_address.*` | — | BT-50, BT-52, BT-53, BT-55 | Non | Adresse imprimée |

On reprend ce que la pièce imprime, sans le compléter. Une pièce adressée au chauffeur en son nom propre, et non à Stairling, échoue à `STAIRLING-DIRECTION` (revue : droit à déduction).

### 5.5 `invoice.payment_instructions` — paiement

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `payment_means_type_code` | chaîne | BT-81 | Non | Code UNTDID 4461 : `48` carte, `30` virement, `10` espèces |

### 5.6 `invoice.lines` — lignes d'achat

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `identifier` | chaîne | BT-126 | Oui | Numéro de la ligne sur la pièce |
| `invoiced_quantity` | entier (× 100) ou chaîne décimale | BT-129 | Oui | Quantité : `3245` = 32,45 |
| `invoiced_quantity_code` | chaîne | BT-130 | Oui | Unité UN/ECE Rec 20 : `LTR` litre, `C62` unité, `KWH` kWh |
| `net_amount` | entier (centimes) | BT-131 | Oui | Montant HT net de la ligne |
| `price_details.item_net_price` | entier (centimes) ou chaîne décimale | BT-146 | Oui | Prix unitaire net ; chaîne s'il a plus de 2 décimales (`"1.5408"`) |
| `item_information.name` | chaîne | BT-153 | Oui | Libellé de l'article (« Gazole B7 ») |
| **`category`** | enum | — (STAIRLING) | Oui | Catégorie de dépense, liste ci-dessous. **Seul champ STAIRLING du bloc `invoice`** |
| `vat_information.invoiced_item_vat_category_code` | enum | BT-151 | Oui | Catégorie TVA de la ligne |
| `vat_information.invoiced_item_vat_rate` | entier (× 100) | BT-152 | Oui | Taux de la ligne ; `0` pour `O`, `E`, `Z` |

**Valeur déduite ou calculée.** La règle du §5.4 vise les données de fond (une partie supposée). Les valeurs **calculées** à partir de la pièce sont reprises : numéro de ligne attribué dans l'ordre, prix unitaire = HT ÷ quantité.

**`category` est toujours déduite par STAIRLING** : aucune pièce ne l'imprime. Elle n'est donc pas signalée comme déduite. La provenance des autres champs reste dans le format pivot (`extraction.fields`), relié par `document_id`.

**Catégories d'achat** (liste STAIRLING versionnée, reprise de `stairling:classification` du format pivot, version `1`) :

| `category` | Contenu |
|---|---|
| `CARBURANT` | Gazole, essence, GPL |
| `RECHARGE_ELECTRIQUE` | Recharge d'un véhicule électrique |
| `PEAGE` | Péage autoroutier payé par le chauffeur |
| `STATIONNEMENT` | Parking, stationnement |
| `LAVAGE` | Lavage et nettoyage du véhicule |
| `ENTRETIEN_REPARATION` | Entretien, réparation, pneumatiques |
| `ASSURANCE` | Assurance du véhicule ou de l'activité |
| `LOCATION_VEHICULE` | Location ou location longue durée du véhicule |
| `TELEPHONE_INTERNET` | Forfait téléphonique, données mobiles |
| `FOURNITURES_CLIENT` | Eau, confiseries, chargeurs mis à disposition des passagers |
| `COMMISSION_PLATEFORME` | Frais de service ou commission de la plateforme |
| `AUTRE` | Non classée : revue humaine obligatoire |

### 5.7 `invoice.vat_break_down` — ventilation TVA

Une entrée par couple catégorie × taux. Une remise ou un frais global porte son propre taux et s'impute sur l'entrée correspondante.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `vat_category_code` | enum | BT-118 | Oui | `S` taux normal ou réduit, `AE` autoliquidation, `O` hors champ, `E` exonéré, `Z` taux zéro |
| `vat_category_rate` | entier (× 100) | BT-119 | Oui | `2000` = 20 % ; `0` pour `O`, `E`, `Z` |
| `vat_category_taxable_amount` | entier (centimes) | BT-116 | Oui | Base HT du taux = lignes − remises + frais de ce taux |
| `vat_category_tax_amount` | entier (centimes) | BT-117 | Oui | TVA du taux, telle qu'imprimée |
| `vat_exemption_reason_code` | chaîne | BT-121 | Si `AE`, `O`, `E` | Code VATEX (`VATEX-EU-O`, `VATEX-EU-AE`…) |
| `vat_exemption_reason` | chaîne | BT-120 | Non | Motif en clair |

### 5.8 `invoice.totals` — totaux

| Champ | Type | Norme | Obligatoire | Description | Calcul |
|---|---|---|---|---|---|
| `sum_invoice_lines_amount` | entier | BT-106 | Oui | Somme des montants HT des lignes | Σ `lines.net_amount` |
| `sum_allowances_amount` | entier | BT-107 | Non | Remises globales | Σ remises |
| `sum_charges_amount` | entier | BT-108 | Non | Frais globaux | Σ frais |
| `total_without_vat` | entier | BT-109 | Oui | Total HT | BT-106 − BT-107 + BT-108 |
| `total_vat_amount.value` | entier | BT-110 | Oui | Total TVA | Σ `vat_category_tax_amount` |
| `total_vat_amount.currency_code` | chaîne | BT-110 (devise) | Oui | Devise de la TVA, égale à `currency_code` | — |
| `total_with_vat` | entier | BT-112 | Oui | Total TTC | BT-109 + BT-110 |
| `paid_amount` | entier | BT-113 | Non | Montant déjà payé (ticket payé en caisse) | — |
| `amount_due_for_payment` | entier | BT-115 | Oui | Reste à payer | BT-112 − BT-113 |

### 5.9 `stairling` — données hors norme

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `rattachement.worker_id` | chaîne | Si pièce d'activité | Entrepreneur-salarié (contrat CESA), = `stream_id`. Absent = frais de structure de la coopérative. Repris de `stairling:routing.worker_id` |
| `rattachement.person_uuid` | UUID | Non | Personne physique ; une personne peut avoir plusieurs contrats `worker_id` |
| `rattachement.link_method` | enum | Si `worker_id` | Comment l'entrepreneur a été identifié : `depot_ocr` (pièce déposée par l'entrepreneur), `manual` (affectation manuelle), `card` (carte carburant nominative) |
| `pivot.format` | chaîne | Oui | Format du document pivot dont l'événement est issu : `urn:stairling:ocr-invoice` (format JSON STAIRLING de traitement des factures). Repris de `format` |
| `pivot.format_version` | chaîne | Oui | Version de ce format (`1.0.0`). Repris de `format_version` ; permet de savoir avec quelle version du pivot l'événement a été construit |
| `source.sha256` | chaîne (64 hex) | Oui | Empreinte du **fichier d'origine** ; repris de `extraction.source.sha256` |
| `source.media_type` | chaîne | Oui | Format du fichier d'origine, type MIME : `image/jpeg`, `image/png` (photo de ticket), `application/pdf` (facture PDF). Repris de `extraction.source.media_type` |
| `source.file_name` | chaîne | Non | Nom du fichier d'origine. Repris de `extraction.source.file_name` |
| `source.page_count` | entier ≥ 1 | Non | Nombre de pages. Repris de `extraction.source.page_count` |

Si le rattachement est corrigé, un nouvel événement porte le nouveau `rattachement` ; l'ancien reste dans l'historique.

**Chaîne des formats.** Fichier d'origine (`source` : photo, PDF) → document pivot STAIRLING (`pivot` : JSON `urn:stairling:ocr-invoice`, identifié par `document_id`) → événement (`schema_version`). `source.sha256` prouve le fichier d'origine ; `integrity.payload_hash` protège l'événement.

## 6. Construction à partir du format pivot

| Payload | Source dans le format pivot |
|---|---|
| `numeric_encoding` | `numeric_encoding` |
| `invoice` | `invoice`, recopié, **sauf** : `buyer` si toutes ses valeurs sont déduites (§5.4) |
| `invoice.lines[].category` | `extensions.stairling:classification.lines[]`, apparié par `line` = `identifier` |
| `stairling.rattachement` | `extensions.stairling:routing` (`worker_id`) ; `person_uuid` et `link_method` ajoutés par le SI |
| `stairling.pivot` | `format`, `format_version` |
| `stairling.source` | `extraction.source` (`sha256`, `media_type`, `file_name`, `page_count`), recopié |
| enveloppe `tenant_id` | `extensions.stairling:routing.tenant_id` |
| enveloppe `document_id` | `document_id` |
| enveloppe `actor` | `extraction.engine.name` (ou `api:<fournisseur>`) |

Ne sont **pas** repris : `extraction` (sauf l'empreinte), `validation` (le contrôle de l'Event Store produit son propre rapport), les extensions `stairling:platform` (sans objet à l'achat).

## 7. Contrôles à la validation

Chemins relatifs à `payload.invoice`. Détail des niveaux, gravités et chemins complets : `STAIRLING_Controle_Facture_v001_draft_2.md`.

| Règle | Contrôle |
|---|---|
| N1 schéma | Le payload respecte le schéma du §10 |
| BR-CO-10 | `totals.sum_invoice_lines_amount` = Σ `lines.net_amount` |
| BR-CO-13 | `totals.total_without_vat` = `sum_invoice_lines_amount` − `sum_allowances_amount` + `sum_charges_amount` |
| BR-S-08 | Pour chaque entrée `S` : `vat_category_taxable_amount` = Σ lignes de ce taux − remises + frais de ce taux |
| BR-S-09 | Pour chaque entrée `S` : `vat_category_tax_amount` = base × taux, arrondi au centime |
| BR-CO-14 | Σ `vat_break_down.vat_category_tax_amount` = `totals.total_vat_amount.value` |
| BR-CO-15 | `total_with_vat` = `total_without_vat` + `total_vat_amount.value` |
| BR-CO-16 | `amount_due_for_payment` = `total_with_vat` − `paid_amount` |
| STAIRLING-DEVISE | `totals.total_vat_amount.currency_code` = `currency_code` |
| STAIRLING-CLASSIFICATION | Chaque ligne a une `category` d'achat ; `AUTRE` bloque la validation jusqu'à revue humaine |
| STAIRLING-DATES | `invoicing_period.start_date` ≤ `end_date` ; `delivery_date` et `invoicing_period` ne sont pas présents ensemble |
| STAIRLING-DIRECTION | SIREN vendeur ≠ SIREN de Stairling Union ; si `buyer` est présent, son SIREN (ou à défaut son nom) désigne Stairling Union ; si `buyer` est absent, la pièce doit venir d'un dépôt d'entrepreneur (`stairling.rattachement.link_method` = `depot_ocr`) |
| STAIRLING-AVOIR | Pour `AVOIR_ACHAT` : `type_code` = `381` et `preceding_invoice_references` renseigné ; pour `FACTURE_ACHAT` : `type_code` ≠ `381` |
| STAIRLING-AVOIR-ORIGINE | La facture citée existe dans le store (même fournisseur) au statut `VALIDE` ; sinon ATTENTE, puis BLOQUANT après le délai |
| STAIRLING-IDEMPOTENCE | Un événement dont l'`event_id` existe déjà est ignoré (pas rejeté) ; une même `invoice_key` avec un `invoice` différent est signalée en revue (pièce corrigée : passer par `previous_document_id`) |

Tous les contrôles passent : nouvel événement au statut `VALIDE`. Un contrôle bloquant échoue : statut `REJETE` avec le motif, aucune écriture produite.

## 8. Exemple : ticket carburant T-0482

Fichier complet : `STAIRLING_Event_FACTURE_ACHAT_exemple_T-0482_v001_draft_4.json`. Plein de gazole de 32,45 L payé par carte, ticket non nominatif déposé par l'entrepreneur `ES-0042`.

```json
{
  "seq": 98318,
  "event_id": "ece6efd1-8c64-56b4-9562-a1e1f103a797",
  "tenant_id": "stairling-union",
  "stream_id": "ES-0042",
  "stream_version": 36,
  "event_type": "FACTURE_ACHAT",
  "schema_version": 3,
  "occurred_at": "2026-10-15T00:00:00Z",
  "recorded_at": "2026-10-15T18:42:05Z",
  "document_id": "91dcf6ab-9b33-41d6-bbda-5930ee798e31",
  "invoice_key": "stairling-union|123456782|T-0482|380",
  "idempotency_key": "stairling-union|123456782|T-0482|380|RECU",
  "correlation_id": "af10a79a-e6bb-548b-be5d-3196fc44b5e5",
  "causation_id": null,
  "actor": "ocr-engine",
  "integrity": {
    "canonicalization": "JCS-RFC8785",
    "algorithm": "sha256",
    "chain_scope": "tenant",
    "payload_hash": "4c905d4e456e37a98557a74b2dc8e17c9d35c3661da7157694b3fd3331482685",
    "prev_hash": "ea6ce575c56fd47821fdbc94cc03176de00318d4a74d18e03d1bcbe85ed9d5fe",
    "hash": "5820be5b07bba68ee7e2d01c288fe99c29edcd5c1f1b4ef6de0b382600be9299"
  },
  "payload": {
    "numeric_encoding": {
      "representation": "scaled_integer",
      "scale": 2
    },
    "statut": "RECU",
    "invoice": {
      "number": "T-0482",
      "issue_date": "2026-10-15",
      "type_code": "380",
      "currency_code": "EUR",
      "delivery_date": "2026-10-15",
      "process_control": {
        "specification_identifier": "urn:cen.eu:en16931:2017"
      },
      "seller": {
        "name": "Station Exemple SAS",
        "legal_registration_identifier": {
          "scheme": "0002",
          "value": "123456782"
        },
        "identifiers": [
          {
            "scheme": "0225",
            "value": "12345678200028"
          }
        ],
        "vat_identifier": "FR11123456782",
        "postal_address": {
          "address_line1": "1 avenue de l'Exemple",
          "post_code": "93200",
          "city": "Saint-Denis",
          "country_code": "FR"
        }
      },
      "payment_instructions": {
        "payment_means_type_code": "48"
      },
      "lines": [
        {
          "identifier": "1",
          "invoiced_quantity": 3245,
          "invoiced_quantity_code": "LTR",
          "net_amount": 5000,
          "price_details": {
            "item_net_price": "1.5408"
          },
          "item_information": {
            "name": "Gazole B7"
          },
          "category": "CARBURANT",
          "vat_information": {
            "invoiced_item_vat_category_code": "S",
            "invoiced_item_vat_rate": 2000
          }
        }
      ],
      "vat_break_down": [
        {
          "vat_category_code": "S",
          "vat_category_rate": 2000,
          "vat_category_taxable_amount": 5000,
          "vat_category_tax_amount": 1000
        }
      ],
      "totals": {
        "sum_invoice_lines_amount": 5000,
        "total_without_vat": 5000,
        "total_vat_amount": {
          "value": 1000,
          "currency_code": "EUR"
        },
        "total_with_vat": 6000,
        "paid_amount": 6000,
        "amount_due_for_payment": 0
      }
    },
    "stairling": {
      "rattachement": {
        "worker_id": "ES-0042",
        "person_uuid": "3d9b7f02-5c1e-4a8b-b6e2-91f0c4a7d218",
        "link_method": "depot_ocr"
      },
      "pivot": {
        "format": "urn:stairling:ocr-invoice",
        "format_version": "1.0.0"
      },
      "source": {
        "sha256": "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
        "media_type": "image/jpeg",
        "file_name": "ticket_station_2026-10-15.jpg",
        "page_count": 1
      }
    }
  }
}
```

`buyer` est absent : le ticket n'imprime pas l'acheteur (le format pivot l'avait seulement déduit). `STAIRLING-DIRECTION` passe car `link_method` = `depot_ocr`.

Contrôles : 5000 = 5000 (BR-CO-10, BR-CO-13) ; 5000 × 20 % = 1000 (BR-S-09) ; 5000 + 1000 = 6000 (BR-CO-15) ; 6000 − 6000 = 0 (BR-CO-16).

Faits produits à la validation :

| Fait | Catégorie | Taux | Montant | Date |
|---|---|---|---|---|
| `ACHAT_HT` | `CARBURANT` | 20 % | 5000 | 2026-10-15 |
| `TVA_DEDUCTIBLE` | `CARBURANT` | 20 % | 1000 | 2026-10-15 |
| `PAIEMENT_FOURNISSEUR` | — | — | 6000, carte (`48`) | 2026-10-15 |

**Avoir d'achat** : même structure, avec

```json
"type_code": "381",
"preceding_invoice_references": [ { "reference": "T-0482", "issue_date": "2026-10-15" } ]
```

## 9. Faits, comptabilité et export

**Faits produits à la validation**

| Fait | Regroupement | Contenu |
|---|---|---|
| `ACHAT_HT` | un par couple `category` × taux | Σ `net_amount` des lignes du couple |
| `TVA_DEDUCTIBLE` | un par couple `category` × taux | TVA du taux répartie au prorata des bases ; le reste d'arrondi va à la plus grosse ligne ; `deductible_ratio` selon la catégorie |
| `PAIEMENT_FOURNISSEUR` | un par pièce, si `paid_amount` > 0 | `paid_amount`, `payment_means_type_code` |

**Export vers un tiers** (logiciel comptable, plateforme agréée) : le bloc `invoice` est transformé ainsi :

1. nombres convertis en décimal (entier ÷ 100) ;
2. `category` retiré des lignes (ou converti en BT-158 avec le schéma `ZZZ` si le tiers le demande) ;
3. le résultat est validé par le schéma EN 16931 du format pivot (variante décimale).

Un ticket sans acheteur ne produit pas de facture EN 16931 complète : il n'est pas transmis à une plateforme agréée.

## 10. Schéma JSON du payload

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:stairling:event:FACTURE_ACHAT:3",
  "type": "object",
  "required": ["numeric_encoding", "statut", "invoice", "stairling"],
  "additionalProperties": false,
  "properties": {
    "numeric_encoding": { "$ref": "#/$defs/NumericEncoding" },
    "statut":   { "enum": ["RECU", "VALIDE", "REJETE", "COMPTABILISE", "REMPLACE"] },
    "controle": { "$ref": "#/$defs/RapportControle" },
    "motif":    { "type": "string", "description": "Obligatoire si statut = REJETE" },
    "ecriture": { "$ref": "#/$defs/Ecriture" },
    "previous_document_id": { "type": "string", "format": "uuid", "description": "Version remplacée" },

    "invoice": {
      "type": "object",
      "description": "Structure EN 16931 (sérialisation en_invoice du format pivot) ; seul ajout : lines[].category",
      "required": ["number", "issue_date", "type_code", "currency_code", "process_control",
                   "seller", "lines", "vat_break_down", "totals"],
      "properties": {
        "number":        { "type": "string", "description": "BT-1" },
        "issue_date":    { "$ref": "#/$defs/Date", "description": "BT-2" },
        "type_code":     { "enum": ["380", "381", "384"], "description": "BT-3" },
        "currency_code": { "$ref": "#/$defs/Devise", "description": "BT-5" },
        "delivery_date": { "$ref": "#/$defs/Date", "description": "BT-72" },
        "invoicing_period": {
          "type": "object", "description": "BG-14",
          "required": ["start_date", "end_date"],
          "properties": {
            "start_date": { "$ref": "#/$defs/Date", "description": "BT-73" },
            "end_date":   { "$ref": "#/$defs/Date", "description": "BT-74" }
          }
        },
        "preceding_invoice_references": {
          "type": "array", "minItems": 1, "description": "BG-3",
          "items": {
            "type": "object", "required": ["reference"],
            "properties": {
              "reference":  { "type": "string", "description": "BT-25" },
              "issue_date": { "$ref": "#/$defs/Date", "description": "BT-26" }
            }
          }
        },
        "process_control": {
          "type": "object", "required": ["specification_identifier"],
          "properties": { "specification_identifier": { "const": "urn:cen.eu:en16931:2017", "description": "BT-24" } }
        },
        "notes": {
          "type": "array",
          "items": { "type": "object", "required": ["note"], "properties": { "note": { "type": "string", "description": "BT-22" } } }
        },
        "seller": {
          "type": "object", "description": "BG-4 (fournisseur)",
          "required": ["name", "postal_address"],
          "properties": {
            "name": { "type": "string", "description": "BT-27" },
            "legal_registration_identifier": { "$ref": "#/$defs/Identifiant", "description": "BT-30 (0002 = SIREN)" },
            "identifiers": { "type": "array", "items": { "$ref": "#/$defs/Identifiant" }, "description": "BT-29 (0225 = SIRET)" },
            "vat_identifier": { "type": "string", "description": "BT-31" },
            "postal_address": { "$ref": "#/$defs/Adresse", "description": "BG-5" }
          }
        },
        "buyer": {
          "type": "object", "description": "BG-7, seulement si la pièce imprime l'acheteur",
          "required": ["name"],
          "properties": {
            "name": { "type": "string", "description": "BT-44" },
            "legal_registration_identifier": { "$ref": "#/$defs/Identifiant", "description": "BT-47" },
            "vat_identifier": { "type": "string", "description": "BT-48" },
            "postal_address": { "$ref": "#/$defs/Adresse", "description": "BG-8" }
          }
        },
        "payment_instructions": {
          "type": "object", "description": "BG-16",
          "properties": { "payment_means_type_code": { "type": "string", "description": "BT-81, UNTDID 4461" } }
        },
        "lines": {
          "type": "array", "minItems": 1, "description": "BG-25",
          "items": {
            "type": "object",
            "required": ["identifier", "invoiced_quantity", "invoiced_quantity_code", "net_amount",
                         "price_details", "item_information", "category", "vat_information"],
            "properties": {
              "identifier":             { "type": "string", "description": "BT-126" },
              "invoiced_quantity":      { "$ref": "#/$defs/Nombre", "description": "BT-129" },
              "invoiced_quantity_code": { "type": "string", "description": "BT-130" },
              "net_amount":             { "$ref": "#/$defs/Montant", "description": "BT-131" },
              "price_details": {
                "type": "object", "required": ["item_net_price"],
                "properties": { "item_net_price": { "$ref": "#/$defs/Nombre", "description": "BT-146" } }
              },
              "item_information": {
                "type": "object", "required": ["name"],
                "properties": { "name": { "type": "string", "description": "BT-153" } }
              },
              "category": { "$ref": "#/$defs/CategorieAchat" },
              "vat_information": {
                "type": "object", "required": ["invoiced_item_vat_category_code", "invoiced_item_vat_rate"],
                "properties": {
                  "invoiced_item_vat_category_code": { "$ref": "#/$defs/CategorieTVA", "description": "BT-151" },
                  "invoiced_item_vat_rate":          { "$ref": "#/$defs/Taux", "description": "BT-152" }
                }
              }
            }
          }
        },
        "vat_break_down": {
          "type": "array", "minItems": 1, "description": "BG-23",
          "items": { "$ref": "#/$defs/VentilationTVA" }
        },
        "totals": {
          "type": "object", "description": "BG-22",
          "required": ["sum_invoice_lines_amount", "total_without_vat", "total_vat_amount",
                       "total_with_vat", "amount_due_for_payment"],
          "properties": {
            "sum_invoice_lines_amount": { "$ref": "#/$defs/Montant", "description": "BT-106" },
            "sum_allowances_amount":    { "$ref": "#/$defs/Montant", "description": "BT-107" },
            "sum_charges_amount":       { "$ref": "#/$defs/Montant", "description": "BT-108" },
            "total_without_vat":        { "$ref": "#/$defs/Montant", "description": "BT-109" },
            "total_vat_amount": {
              "type": "object", "required": ["value", "currency_code"], "description": "BT-110",
              "properties": { "value": { "$ref": "#/$defs/Montant" }, "currency_code": { "$ref": "#/$defs/Devise" } }
            },
            "total_with_vat":           { "$ref": "#/$defs/Montant", "description": "BT-112" },
            "paid_amount":              { "$ref": "#/$defs/Montant", "description": "BT-113" },
            "amount_due_for_payment":   { "$ref": "#/$defs/Montant", "description": "BT-115" }
          }
        }
      },
      "allOf": [
        { "if":   { "properties": { "type_code": { "enum": ["381", "384"] } } },
          "then": { "required": ["preceding_invoice_references"] } },
        { "not":  { "required": ["delivery_date", "invoicing_period"] } }
      ]
    },

    "stairling": {
      "type": "object",
      "required": ["pivot", "source"],
      "additionalProperties": false,
      "properties": {
        "rattachement": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "worker_id": { "type": "string" },
            "person_uuid":     { "type": "string", "format": "uuid" },
            "link_method":     { "enum": ["depot_ocr", "manual", "card"] }
          },
          "dependentRequired": { "worker_id": ["link_method"] }
        },
        "pivot": {
          "type": "object", "required": ["format", "format_version"], "additionalProperties": false,
          "properties": {
            "format":         { "const": "urn:stairling:ocr-invoice" },
            "format_version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$" }
          }
        },
        "source": {
          "type": "object", "required": ["sha256", "media_type"], "additionalProperties": false,
          "properties": {
            "sha256":     { "type": "string", "pattern": "^[0-9a-f]{64}$" },
            "media_type": { "type": "string", "description": "Type MIME (RFC 6838) du fichier d'origine" },
            "file_name":  { "type": "string" },
            "page_count": { "type": "integer", "minimum": 1 }
          }
        }
      }
    }
  },

  "allOf": [
    { "if":   { "properties": { "statut": { "enum": ["VALIDE", "REJETE", "COMPTABILISE"] } } },
      "then": { "required": ["controle"] } },
    { "if":   { "properties": { "statut": { "const": "COMPTABILISE" } } },
      "then": { "required": ["ecriture"] } },
    { "if":   { "properties": { "statut": { "const": "REJETE" } } },
      "then": { "required": ["motif"] } }
  ],

  "$defs": {
    "NumericEncoding": {
      "type": "object", "required": ["representation", "scale"], "additionalProperties": false,
      "properties": { "representation": { "const": "scaled_integer" }, "scale": { "const": 2 } }
    },
    "Date":    { "type": "string", "format": "date" },
    "Devise":  { "type": "string", "pattern": "^[A-Z]{3}$" },
    "Montant": { "type": "integer", "description": "Centimes (échelle 2)" },
    "Taux":    { "type": "integer", "description": "Échelle 2 : 2000 = 20,00 %" },
    "Nombre": {
      "description": "Entier à l'échelle 2, ou chaîne décimale si plus de 2 décimales",
      "oneOf": [ { "type": "integer" }, { "type": "string", "pattern": "^-?[0-9]+\\.[0-9]{3,}$" } ]
    },
    "Identifiant": {
      "type": "object", "required": ["value"],
      "properties": { "scheme": { "type": "string" }, "value": { "type": "string" } }
    },
    "Adresse": {
      "type": "object", "required": ["country_code"],
      "properties": {
        "address_line1": { "type": "string" },
        "post_code":     { "type": "string" },
        "city":          { "type": "string" },
        "country_code":  { "type": "string", "pattern": "^[A-Z]{2}$" }
      }
    },
    "CategorieTVA": { "enum": ["S", "AE", "O", "E", "Z"], "description": "BT-118 / BT-151" },
    "CategorieAchat": {
      "enum": ["CARBURANT", "RECHARGE_ELECTRIQUE", "PEAGE", "STATIONNEMENT", "LAVAGE",
               "ENTRETIEN_REPARATION", "ASSURANCE", "LOCATION_VEHICULE", "TELEPHONE_INTERNET",
               "FOURNITURES_CLIENT", "COMMISSION_PLATEFORME", "AUTRE"],
      "description": "Liste STAIRLING version 1, catégories d'achat"
    },
    "VentilationTVA": {
      "type": "object",
      "required": ["vat_category_code", "vat_category_rate", "vat_category_taxable_amount", "vat_category_tax_amount"],
      "properties": {
        "vat_category_code":           { "$ref": "#/$defs/CategorieTVA", "description": "BT-118" },
        "vat_category_rate":           { "$ref": "#/$defs/Taux", "description": "BT-119" },
        "vat_category_taxable_amount": { "$ref": "#/$defs/Montant", "description": "BT-116" },
        "vat_category_tax_amount":     { "$ref": "#/$defs/Montant", "description": "BT-117" },
        "vat_exemption_reason_code":   { "type": "string", "description": "BT-121" },
        "vat_exemption_reason":        { "type": "string", "description": "BT-120" }
      }
    },
    "Ecriture": {
      "type": "object", "required": ["event_id", "journal", "ecriture_date"],
      "properties": {
        "event_id":      { "type": "string", "format": "uuid", "description": "event_id de l'ECRITURE_COMPTABILISEE" },
        "journal":       { "type": "string", "examples": ["JA"] },
        "ecriture_num":  { "type": "string" },
        "ecriture_date": { "$ref": "#/$defs/Date" }
      }
    },
    "RapportControle": {
      "type": "object",
      "description": "Voir STAIRLING_Controle_Facture_v001_draft_2.md §5",
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
    }
  }
}
```

## 11. Écarts à la norme EN 16931 et points ouverts

| # | Sujet | Situation | Décision attendue |
|---|---|---|---|
| 1 | Nombres en entiers | Écart assumé : la norme écrit des décimaux. Conversion à l'export (§9) | — |
| 2 | `lines[].category` | Écart assumé : champ STAIRLING dans le bloc `invoice`. Retiré à l'export | — |
| 3 | Acheteur absent (ticket) | Écart assumé : BG-7 obligatoire dans la norme ; un ticket n'est pas une facture électronique | Confirmer que les tickets ne sont jamais transmis à une plateforme agréée |
| 4 | Nom de BT-72 | Décidé le 10/11/2026 : `delivery_date` à la racine de `invoice` (nom STAIRLING, repris de la v001). Absent du schéma du format pivot | Ajouter `delivery_date` (BT-72) au schéma du pivot |
| 5 | BT-26 | Recommandé, non obligatoire | Le rendre obligatoire pour les avoirs ? |
| 6 | Espace de noms UUID v5 | Provisoire (`urn:stairling:event-store`) | Fixer la valeur officielle |
| 7 | `link_method` | Valeurs proposées : `depot_ocr`, `manual`, `card` | Valider la liste |
| 8 | Requêtes SQL des processus | Chemins à mettre à jour : `payload->>'number'` devient `payload->'invoice'->>'number'`, etc. | Mettre à jour les processus. Contrôles : fait dans `STAIRLING_Controle_Facture_v001_draft_2.md` |
| 9 | Flux des frais de structure | Un flux par entrepreneur ; un frais de structure (sans `worker_id`) est rangé dans le flux `STAIRLING` | Confirmer ce flux dédié, ou un autre rangement |
| 10 | Retour au même statut | `idempotency_key` = `invoice_key` \| statut : une pièce ne peut pas repasser deux fois par le même statut (ex. VALIDE → REJETE → VALIDE) | Si ce cas existe, ajouter `document_id` ou un compteur à `idempotency_key` |
