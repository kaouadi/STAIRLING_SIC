# STAIRLING — Payload de l'événement `FACTURE_VENTE`

| | |
|---|---|
| Document | Description de l'événement `FACTURE_VENTE` / `AVOIR_VENTE` de l'Event Store : enveloppe et payload (fiche de liaison) |
| Version | v001 draft 4 — 10 novembre 2026. Remplace la v001 initiale (archivée dans `_arch/`). Refonte du payload : il contient un bloc `invoice` à la structure EN 16931 (reprise du format pivot OCR) et un bloc `stairling` pour les données hors norme ; enveloppe enrichie (`tenant_id`, `invoice_key`, `idempotency_key`, `event_id` déterministe, `correlation_id`, `integrity`) ; catégorie portée sur la ligne ; pourboires et bonus en lignes, tels que le mandataire les imprime |
| Version du payload | `schema_version` = `3` (schéma `urn:stairling:event:FACTURE_VENTE:3`). Numérotation distincte de celle de la fiche, voir §3.1 |
| Auteur | AOUADI Karim |
| Rattachement | Format pivot `urn:stairling:ocr-invoice` (`OCR/STAIRLING_Format_Facture_OCR_v001_draft_16.docx`, schéma `OCR/STAIRLING_Format_Facture_OCR_invoice_v001.schema.json`) ; payload `FACTURE_ACHAT` v001 draft 4 ; `STAIRLING_Controle_Facture_v001_draft_2.md` ; `STAIRLING_Processus_Traitement_Facture_Vente_v002.md` ; proposition de mise à jour de l'Event Store, §5.4, §7, §13.2 |
| Norme | EN 16931 (`urn:cen.eu:en16931:2017`) |
| Exemples de référence | `STAIRLING_Event_FACTURE_VENTE_exemple_pourboire_bonus_v001_draft_4.json`, `STAIRLING_Event_AVOIR_VENTE_exemple_bonus_v001_draft_4.json` |

## 1. Objet

L'événement `FACTURE_VENTE` enregistre dans l'Event Store une facture de vente émise par une plateforme (Uber, Bolt, Heetch, FreeNow) **au nom et pour le compte de Stairling Union**, sous mandat de facturation. Le SIC n'émet pas de facture de vente : il reçoit celle du mandataire, la contrôle et la rattache aux courses.

L'événement `AVOIR_VENTE` utilise le même payload, avec `invoice.type_code` = `381` et `invoice.preceding_invoice_references` renseigné. Le sens (vente) est porté par le type d'événement : `FACTURE_VENTE` et `AVOIR_VENTE` d'un côté, `FACTURE_ACHAT` et `AVOIR_ACHAT` de l'autre.

**Principe du draft 4.** Le payload sépare ce qui relève de la facture de ce qui relève de STAIRLING :

- `invoice` reprend le bloc `invoice` du format pivot, avec les mêmes noms de champs et la même structure (sérialisation `en_invoice` de l'EN 16931). Un seul ajout : `category` sur chaque ligne ;
- `stairling` contient les données que la norme ne prévoit pas : plateforme, courses, rattachement au chauffeur, flotte donneuse d'ordre, type d'acheteur, empreinte du fichier source ;
- à la racine restent les champs du cycle de vie : `statut`, `controle`, `motif`, `ecriture`.

**Ce que le payload n'est pas.** Il n'est pas une facture EN 16931 transmissible telle quelle : les nombres sont des entiers à l'échelle 2, la ligne porte un champ `category`, et une facture avec pourboire ou bonus mélange les catégories de TVA `S` et `O` (§5.6). La facture transmise à un tiers est produite à l'export (§9).

Ventes et achats partagent le même format : les blocs `invoice` et `stairling` ont la même structure que dans `STAIRLING_Event_Payload_FACTURE_ACHAT_v001_draft_4.md`. Ce qui change : l'acheteur toujours présent, la liste des catégories de ligne, et les champs `stairling` propres à la vente (`plateforme`, `activity_ids`, `principal`, `buyer_type`).

## 2. Structure de l'événement

```
FACTURE_VENTE / AVOIR_VENTE
├─ enveloppe        seq, event_id, tenant_id, stream_id, stream_version, event_type,
│                   schema_version, occurred_at, recorded_at, document_id,
│                   invoice_key, idempotency_key, correlation_id, causation_id, actor,
│                   integrity {canonicalization, algorithm, chain_scope,
│                              payload_hash, prev_hash, hash}
└─ payload
   ├─ numeric_encoding   representation = scaled_integer, scale = 2
   ├─ statut, controle, motif, ecriture                           (cycle de vie)
   ├─ invoice                                                     (structure EN 16931)
   │  ├─ number, issue_date, type_code, currency_code
   │  ├─ delivery_date | invoicing_period {start_date, end_date}
   │  ├─ preceding_invoice_references [ {reference, issue_date} ] (avoir, rectificative)
   │  ├─ process_control {specification_identifier}
   │  ├─ notes [ {note} ]                                         (mention du mandat)
   │  ├─ seller   {name, legal_registration_identifier, vat_identifier, postal_address}
   │  ├─ buyer    {name, legal_registration_identifier, vat_identifier, postal_address}
   │  ├─ third_party_biller {name, vat_identifier, postal_address} (mandataire)
   │  ├─ lines [ {identifier, invoiced_quantity, invoiced_quantity_code, net_amount,
   │  │           price_details, item_information, category, vat_information}, … ]
   │  ├─ vat_break_down [ {vat_category_code, vat_category_rate, vat_category_taxable_amount,
   │  │                    vat_category_tax_amount, vat_exemption_reason_code, vat_exemption_reason}, … ]
   │  └─ totals {sum_invoice_lines_amount, sum_allowances_amount, sum_charges_amount,
   │             total_without_vat, total_vat_amount {value, currency_code},
   │             total_with_vat, paid_amount, amount_due_for_payment}
   └─ stairling                                                   (hors norme)
      ├─ plateforme, activity_ids
      ├─ rattachement {worker_id, person_uuid, platform_driver_id, link_method}
      ├─ principal {name, siren}
      ├─ buyer_type
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
| `stream_id` | chaîne | — | Oui | Flux de l'entrepreneur : **un flux par entrepreneur**, identifié par son `worker_id` (`ES-0042`, le chauffeur). Unique dans le tenant |
| `stream_version` | entier | — | Oui | Numéro de l'événement dans le flux de l'entrepreneur (1, 2, 3…). Unique par (`tenant_id`, `stream_id`, `stream_version`) ; sert au contrôle de concurrence optimiste : l'écriture échoue si la version attendue n'est plus la dernière. Calcul : §3.2 |
| `event_type` | enum | — | Oui | `FACTURE_VENTE` ou `AVOIR_VENTE` |
| `schema_version` | entier | — | Oui | Version du schéma du payload : `3` pour le payload décrit ici. Voir §3.1 |
| `occurred_at` | date-heure | — | Oui | Date d'émission de la facture (`invoice.issue_date`, à minuit UTC) |
| `recorded_at` | date-heure | — | Oui | Date d'enregistrement ; pour le `RECU`, c'est la date de **récupération** de la facture, qui décide entre traitement de J+1 et régularisation du 10 |
| `document_id` | UUID | — | Oui | Identifiant du document pivot (table `documents`) ; identique pour tous les statuts d'une même facture |
| `invoice_key` | chaîne | ✅ | Oui | **Identité métier de la facture**, la même sur tous ses événements (tous statuts, toutes corrections) : `tenant_id` \| SIREN du vendeur (BT-30) \| numéro (BT-1) \| type (BT-3). Ex. `stairling-union|928978279|UBER-FR-2026-118240|380`. Le numéro seul ne suffit pas : la norme ne le garantit unique que par vendeur. Un avoir (`381`) a sa propre clé |
| `idempotency_key` | chaîne | ✅ | Oui | **Anti-doublon** : `invoice_key` \| `payload.statut`. Ex. `stairling-union|928978279|UBER-FR-2026-118240|380|RECU`. Unique dans l'Event Store : un même changement d'état n'est enregistré qu'une fois |
| `correlation_id` | UUID | ✅ | Oui | Identique sur toute la chaîne de traitement d'une facture (`RECU` → `VALIDE` → `COMPTABILISE`, écriture). UUID v5 calculé à partir de `invoice_key` (`"correlation|" + invoice_key`) : il ne change pas quand une facture corrigée reçoit un nouveau `document_id`. Un avoir a son propre `correlation_id` ; il est relié à la facture d'origine par BT-25 |
| `causation_id` | UUID ou `null` | — | Oui | `event_id` de l'événement qui a provoqué celui-ci ; `null` pour le `RECU` |
| `actor` | chaîne | — | Oui | Origine : `api:uber`, `api:bolt`, `ocr-engine`, `user:<id>` |
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

Le hash est calculé sur le payload avec ses entiers à l'échelle 2 : la conversion en décimal pour un tiers ne change pas le hash. `integrity` n'est pas `payload.stairling.source.sha256` : ce dernier est l'empreinte du **fichier d'origine** (PDF de la plateforme).

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

**Identifiant du schéma.** Le schéma JSON de validation se déduit de l'enveloppe : `urn:stairling:event:FACTURE_VENTE:{schema_version}`, soit `urn:stairling:event:FACTURE_VENTE:3` (§10). Le même schéma sert pour `FACTURE_VENTE` et `AVOIR_VENTE`. Aucun champ supplémentaire n'est nécessaire dans l'enveloppe ni dans le payload.

**Historique.**

| `schema_version` | Description | Référence |
|---|---|---|
| `1` | Payload à plat (`seller.city`, `delivery_date`, `preceding_invoice_number`), nombres entiers à l'échelle 2 | `_arch/STAIRLING_Event_Payload_FACTURE_VENTE_v001.md` |
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

Flux `ES-0042`, dernière version 51 :

| Étape | Version attendue | `stream_version` écrite | `seq` | Résultat |
|---|---|---|---|---|
| Import Uber : facture `UBER-FR-2026-118240` RECU | 51 | 52 | 104527 | accepté |
| Contrôle : VALIDE | 52 | 53 | 104530 | accepté |
| *En parallèle* : import Bolt d'une autre facture du même chauffeur, version 52 lue avant l'étape précédente | 52 | 53 | — | **conflit** : relecture (53), écriture en 54 |
| Import Uber rejoué (même facture, RECU) | — | — | — | **ignoré** : `idempotency_key` déjà présente (étape 1) |

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
| 1 | Cycle de vie (racine) | champs simples | — | Oui | `statut`, `controle`, `motif`, `ecriture` |
| 2 | `invoice` — identification | champs simples | BT-1, BT-2, BT-3, BT-5, BG-2 | Oui | Numéro, dates, type, devise, spécification |
| 2b | `invoice` — dates d'exécution | champ ou objet | BT-72, BG-14 | **L'un des deux** | Date de la course, ou période pour plusieurs courses |
| 2c | `invoice.preceding_invoice_references` | tableau | BG-3 (BT-25, BT-26) | Si `381` ou `384` | Facture d'origine d'un avoir |
| 3 | `invoice.seller` | objet | BG-4, BG-5 | Oui | Vendeur : Stairling Union ou chauffeur de la coopérative |
| 4 | `invoice.buyer` | objet | BG-7, BG-8 | Oui | Passager ou client professionnel |
| 5 | `invoice.third_party_biller` | objet | — (repris du pivot) | Oui | Mandataire qui a émis la facture (Uber B.V.…) |
| 6 | `invoice.lines` | tableau | BG-25 + `category` | Oui, ≥ 1 | Lignes telles qu'imprimées, pourboire et bonus compris |
| 7 | `invoice.vat_break_down` | tableau | BG-23 | Oui | Base et TVA par couple catégorie × taux |
| 8 | `invoice.totals` | objet | BG-22 | Oui | Totaux tels qu'imprimés |
| 9 | `stairling` | objet | — | Oui | Plateforme, courses, rattachement, flotte, type d'acheteur, empreinte |

**Encodage numérique** : `numeric_encoding` déclare l'encodage de tous les nombres du bloc `invoice`. Une seule valeur est admise : `scaled_integer` à l'échelle 2, comme dans le format pivot.

- Montants en centimes : `2727` = 27,27 €.
- Taux × 100 : `1000` = 10 %, `2000` = 20 %.
- Quantités × 100 : `100` = 1 course.
- Une valeur plus précise que 2 décimales reste une **chaîne décimale**.
- Aucun nombre à virgule flottante. Vers un tiers, les valeurs sont converties en décimal (§9).

```json
"numeric_encoding": { "representation": "scaled_integer", "scale": 2 }
```

## 5. Détail des blocs

### 5.1 Cycle de vie (racine du payload)

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `statut` | enum | Oui | `RECU`, `VALIDE` (contrôlée, en attente de comptabilisation), `REJETE`, `COMPTABILISE` (enregistrée dans le journal de vente), `REMPLACE`. Un changement de statut = un nouvel événement avec le même `document_id` et le même `invoice` ; seuls `statut`, `controle`, `motif` et `ecriture` changent (voir `STAIRLING_Processus_Traitement_Facture_Vente_v002.md`) |
| `controle` | objet | Si `VALIDE`, `REJETE` ou `COMPTABILISE` | Rapport du contrôle : `run_id`, `executed_at`, `rules_version`, `checks[]` (voir `STAIRLING_Controle_Facture_v001_draft_2.md` §5) |
| `motif` | chaîne | Si `REJETE` | Résumé lisible des règles bloquantes en échec |
| `ecriture` | objet | Si `COMPTABILISE` | Lien vers l'écriture journalière : `event_id` (de l'`ECRITURE_COMPTABILISEE`), `journal`, `ecriture_num`, `ecriture_date` |

### 5.2 `invoice` — identification et dates

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `number` | chaîne | BT-1 | Oui | Numéro attribué par la plateforme |
| `issue_date` | date | BT-2 | Oui | Date d'**émission** (`AAAA-MM-JJ`) |
| `type_code` | enum | BT-3 | Oui | `380` facture, `381` avoir, `384` facture rectificative. Une facture émise sous mandat reste un `380` : ce n'est pas une auto-facturation (`389`) |
| `currency_code` | chaîne (3 lettres) | BT-5 | Oui | Devise ISO 4217 (`EUR`) |
| `delivery_date` | date | BT-72 | Si une seule course | Date d'**exécution** : le jour de la course |
| `invoicing_period.start_date` | date | BT-73 | Si plusieurs courses | Premier jour de la période facturée |
| `invoicing_period.end_date` | date | BT-74 | Si plusieurs courses | Dernier jour de la période facturée |
| `preceding_invoice_references[].reference` | chaîne | BT-25 | Si `381` ou `384` | Numéro de la facture d'origine |
| `preceding_invoice_references[].issue_date` | date | BT-26 | Recommandé | Date de la facture d'origine |
| `process_control.specification_identifier` | chaîne | BT-24 | Oui | `urn:cen.eu:en16931:2017` |
| `notes[].note` | chaîne | BT-22 | Recommandé | Mention du mandat imprimée : « Facture établie au nom et pour le compte de STAIRLING UNION par … » |

L'un des deux, `delivery_date` ou `invoicing_period`, est obligatoire : la date de la prestation doit figurer sur la facture quand elle diffère de la date d'émission. Ils ne sont jamais présents ensemble.

**Dans l'Event Store** : l'événement a pour `occurred_at` la date d'émission ; les faits de chiffre d'affaires et de TVA collectée ont pour `occurred_at` la date de la course. C'est la date d'exécution qui place le chiffre d'affaires dans le bon jour du journal de vente et le bon mois de la fiche de liaison, même si la facture est émise plus tard.

Pour un avoir, `delivery_date` reste la date de la **course corrigée**, pas celle de l'avoir : la correction se rattache au bon jour.

### 5.3 `invoice.seller` — vendeur

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-27 | Oui | `STAIRLING UNION`, ou nom du chauffeur vendeur |
| `legal_registration_identifier` | `{scheme, value}` | BT-30 | Oui | SIREN (`0002`) : Stairling Union (`928978279`) ou chauffeur de la coopérative. Sert à `STAIRLING-DIRECTION` et à `invoice_key` |
| `identifiers[]` | `{scheme, value}` | BT-29 | Non | SIRET (`0225`) |
| `vat_identifier` | chaîne | BT-31 | Si une ligne est `S` | Numéro de TVA (BR-S-02) ; contrôlé par `STAIRLING-TVA-VENDEUR` |
| `postal_address.address_line1` | chaîne | BT-35 | Non | Adresse |
| `postal_address.post_code` | chaîne | BT-38 | Non | Code postal |
| `postal_address.city` | chaîne | BT-37 | Non | Ville |
| `postal_address.country_code` | chaîne (2 lettres) | BT-40 | Oui | Code pays ISO 3166 |

**Données personnelles** : pour Stairling Union, aucune contrainte. Pour un chauffeur vendeur en nom propre, nom et adresse sont des données personnelles écrites dans un store immuable : point à valider.

### 5.4 `invoice.buyer` — acheteur

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `name` | chaîne | BT-44 | Si B2B | Raison sociale |
| `legal_registration_identifier` | `{scheme, value}` | BT-47 | Si B2B | SIREN de l'acheteur (`0002`) |
| `vat_identifier` | chaîne | BT-48 | Non | Numéro de TVA intracommunautaire |
| `postal_address.*` | — | BT-50, BT-52, BT-53 | Non | Adresse |
| `postal_address.country_code` | chaîne (2 lettres) | BT-55 | Oui | Code pays ISO 3166 |

Le type d'acheteur (`B2C` ou `B2B`) n'est pas un terme de la norme : il est dans `stairling.buyer_type` (§5.9).

**Données personnelles** : l'Event Store est immuable. Pour un acheteur `B2C`, seul `postal_address.country_code` est écrit ; nom et adresse restent dans la table `documents` (JSON pivot), purgeable à la fin de la conservation légale. **Écart à la norme assumé** : BT-44 est obligatoire dans l'EN 16931 ; il est rétabli depuis le pivot à l'export.

### 5.5 `invoice.third_party_biller` — mandataire

Repris tel quel du format pivot : `name`, `vat_identifier`, `identifiers[]`, `postal_address`. Désigne la plateforme qui a émis la facture au nom de Stairling (ex. Uber B.V.). Avec `notes`, il atteste du mandat de facturation.

### 5.6 `invoice.lines` — lignes de la facture

Les lignes sont reprises **telles que le mandataire les imprime**, y compris le pourboire et le bonus.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `identifier` | chaîne | BT-126 | Oui | Numéro de la ligne sur la facture |
| `invoiced_quantity` | entier (× 100) | BT-129 | Oui | `100` = 1 course |
| `invoiced_quantity_code` | chaîne | BT-130 | Oui | `C62` (unité) |
| `net_amount` | entier (centimes) | BT-131 | Oui | Montant HT net de la ligne |
| `price_details.item_net_price` | entier (centimes) ou chaîne décimale | BT-146 | Oui | Prix unitaire net |
| `item_information.name` | chaîne | BT-153 | Oui | Libellé imprimé (« Prix du service de transport », « Pourboire ») |
| **`category`** | enum | — (STAIRLING) | Oui | Nature de la ligne, liste ci-dessous. **Seul champ STAIRLING du bloc `invoice`** |
| `vat_information.invoiced_item_vat_category_code` | enum | BT-151 | Oui | `S`, `AE`, `O`, `E`, `Z` |
| `vat_information.invoiced_item_vat_rate` | entier (× 100) | BT-152 | Oui | `1000` = 10 % ; `0` pour `O`, `E`, `Z` |

**`category` est toujours déduite par STAIRLING** (à partir du libellé ou de la donnée de la plateforme) : elle n'est pas signalée comme déduite. La provenance des autres champs reste dans le format pivot (`extraction.fields`), relié par `document_id`.

**Catégories de vente** (liste STAIRLING versionnée, version `1` + `POURBOIRE`) :

| `category` | Contenu | Dans la facture transmise à un tiers |
|---|---|---|
| `COURSE` | Prix d'une course de transport de personnes | Oui |
| `SUPPLEMENT_COURSE` | Supplément refacturé au client : péage, aéroport, bagages | Oui |
| `FRAIS_ANNULATION` | Frais d'annulation ou d'attente facturés au client | Oui |
| `POURBOIRE` | Pourboire encaissé par le mandataire pour le chauffeur | **Non** |
| `PRIME_PLATEFORME` | Bonus et incitations versés par la plateforme | **Non** |
| `AUTRE` | Non classée : revue humaine obligatoire | — (bloque la validation) |

La colonne « Dans la facture transmise » ne change rien au stockage. Elle sert seulement à l'export (§9) : les lignes marquées « Non » en sont retirées.

**Pourboire et bonus en lignes : écart à la norme assumé.** Le pourboire et le bonus sont hors du champ de la TVA (`O`). La règle EN 16931 **BR-O-11** interdit qu'une facture porte la catégorie `O` avec une autre catégorie : une course taxée (`S`) et un pourboire sur la même facture la rendent non conforme. Le payload reproduit pourtant la facture du mandataire, qui imprime ces lignes. En conséquence :

- `BR-O-11` est contrôlée en **avertissement**, pas en blocage (§7) ;
- cette fiche **remplace la décision du 28/10/2026** du format pivot (§4.3 « Pourboires », pourboire sorti de la facture vers `stairling:platform.tips`) : le format pivot doit être aligné (§11) ;
- sous mandat, la facture reste celle de Stairling Union : la non-conformité de la facture du mandataire est à traiter avec les plateformes avant l'obligation de facturation électronique.

Remises et frais globaux (code promo, frais de réservation) ne sont pas des lignes : leurs montants sont portés par `totals` (BT-107, BT-108) et imputés sur l'entrée de `vat_break_down` de leur taux.

### 5.7 `invoice.vat_break_down` — ventilation TVA

Une entrée par couple catégorie × taux. Une remise ou un frais global porte son propre taux et s'impute sur l'entrée correspondante.

| Champ | Type | Norme | Obligatoire | Description |
|---|---|---|---|---|
| `vat_category_code` | enum | BT-118 | Oui | `S` taux normal ou réduit, `AE` autoliquidation, `O` hors champ, `E` exonéré, `Z` taux zéro |
| `vat_category_rate` | entier (× 100) | BT-119 | Oui | `1000` = 10 %, `2000` = 20 % ; `0` pour `O`, `E`, `Z` |
| `vat_category_taxable_amount` | entier (centimes) | BT-116 | Oui | Base HT du taux = lignes − remises + frais de ce taux |
| `vat_category_tax_amount` | entier (centimes) | BT-117 | Oui | TVA du taux = base × taux, arrondie au centime ; `0` pour `O`, `E`, `Z` |
| `vat_exemption_reason_code` | chaîne | BT-121 | Si `AE`, `O`, `E` | Code VATEX : `VATEX-EU-O` pour le pourboire et le bonus |
| `vat_exemption_reason` | chaîne | BT-120 | Non | Motif en clair |

Un taux à 0 n'est jamais lu seul : `O` (hors champ, absent de la CA3), `E` (exonéré, déclaré en CA3) et `Z` se distinguent par `vat_category_code`.

### 5.8 `invoice.totals` — totaux

Les totaux sont recopiés **tels qu'imprimés**, pourboire et bonus compris.

| Champ | Type | Norme | Obligatoire | Description | Calcul |
|---|---|---|---|---|---|
| `sum_invoice_lines_amount` | entier | BT-106 | Oui | Somme des montants HT des lignes | Σ `lines.net_amount` |
| `sum_allowances_amount` | entier | BT-107 | Non | Remises globales | Σ remises |
| `sum_charges_amount` | entier | BT-108 | Non | Frais globaux | Σ frais |
| `total_without_vat` | entier | BT-109 | Oui | Total HT | BT-106 − BT-107 + BT-108 |
| `total_vat_amount.value` | entier | BT-110 | Oui | Total TVA | Σ `vat_category_tax_amount` |
| `total_vat_amount.currency_code` | chaîne | BT-110 (devise) | Oui | Égale à `currency_code` | — |
| `total_with_vat` | entier | BT-112 | Oui | Total TTC | BT-109 + BT-110 |
| `paid_amount` | entier | BT-113 | Non | Montant déjà payé | — |
| `amount_due_for_payment` | entier | BT-115 | Oui | Montant à payer | BT-112 − BT-113 ; sans paiement imputé : BT-112 |

### 5.9 `stairling` — données hors norme

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `plateforme` | enum | Oui | `UBER`, `BOLT`, `HEETCH`, `FREENOW` ; désigne aussi le mandataire émetteur |
| `activity_ids` | tableau de chaînes | Oui (≥ 1) | Identifiants des courses couvertes (`<PLATEFORME>-<id>`), tableau : un relevé peut couvrir plusieurs courses. Repris de `stairling:platform.activity_ids` |
| `rattachement.worker_id` | chaîne | Oui | Chauffeur, entrepreneur-salarié (contrat CESA) ; = `stream_id`. Repris de `stairling:routing.worker_id` |
| `rattachement.person_uuid` | UUID | Non | Personne physique ; une personne peut avoir plusieurs contrats `worker_id` |
| `rattachement.platform_driver_id` | chaîne | Non | Identifiant du chauffeur chez la plateforme. Repris de `stairling:platform.platform_driver_id` |
| `rattachement.link_method` | enum | Oui | Comment le chauffeur a été identifié : `platform_driver_id`, `activity_id` (par la course), `manual` |
| `principal` | `{name, siren}` | Si flotte | Flotte donneuse d'ordre, quand elle n'est ni l'acheteur ni le vendeur. Si la flotte achète la course, elle est dans `invoice.buyer` |
| `buyer_type` | enum | Oui | `B2C` (particulier) ou `B2B` (professionnel) |
| `pivot.format` | chaîne | Oui | Format du document pivot dont l'événement est issu : `urn:stairling:ocr-invoice` (format JSON STAIRLING de traitement des factures). Repris de `format` |
| `pivot.format_version` | chaîne | Oui | Version de ce format (`1.0.0`). Repris de `format_version` ; permet de savoir avec quelle version du pivot l'événement a été construit |
| `source.sha256` | chaîne (64 hex) | Oui | Empreinte du **fichier d'origine** ; repris de `extraction.source.sha256` |
| `source.media_type` | chaîne | Oui | Format du fichier d'origine, type MIME : `application/pdf` (facture ou relevé de la plateforme), `image/jpeg`, `image/png`. Repris de `extraction.source.media_type` |
| `source.file_name` | chaîne | Non | Nom du fichier d'origine. Repris de `extraction.source.file_name` |
| `source.page_count` | entier ≥ 1 | Non | Nombre de pages. Repris de `extraction.source.page_count` |

Si le rattachement est corrigé, un nouvel événement porte le nouveau `rattachement` ; l'ancien reste dans l'historique.

**Chaîne des formats.** Fichier d'origine (`source` : photo, PDF) → document pivot STAIRLING (`pivot` : JSON `urn:stairling:ocr-invoice`, identifié par `document_id`) → événement (`schema_version`). `source.sha256` prouve le fichier d'origine ; `integrity.payload_hash` protège l'événement.

## 6. Construction à partir du format pivot

| Payload | Source dans le format pivot |
|---|---|
| `numeric_encoding` | `numeric_encoding` |
| `invoice` | `invoice`, recopié ; pour un acheteur `B2C`, `buyer` réduit à `postal_address.country_code` |
| `invoice.lines[].category` | `extensions.stairling:classification.lines[]`, apparié par `line` = `identifier` |
| `invoice.lines[]` pourboire | Le pivot actuel sort le pourboire vers `stairling:platform.tips` (§4.3 du pivot) : à aligner (§11). En attendant, la ligne est reconstituée depuis `tips[]` avec `category` = `POURBOIRE`, catégorie TVA `O` |
| `stairling.plateforme`, `activity_ids` | `extensions.stairling:platform.platform_id`, `activity_ids` (mêmes noms) |
| `stairling.rattachement` | `extensions.stairling:routing.worker_id`, `stairling:platform.platform_driver_id` ; `person_uuid` et `link_method` ajoutés par le SI |
| `stairling.pivot` | `format`, `format_version` |
| `stairling.source` | `extraction.source` (`sha256`, `media_type`, `file_name`, `page_count`), recopié |
| enveloppe `tenant_id` | `extensions.stairling:routing.tenant_id` |
| enveloppe `document_id` | `document_id` |

## 7. Contrôles à la validation

Chemins relatifs à `payload.invoice`. Détail des niveaux, gravités et chemins complets : `STAIRLING_Controle_Facture_v001_draft_2.md`.

| Règle | Gravité | Contrôle |
|---|---|---|
| N1 schéma | Bloquant | Le payload respecte le schéma du §10 |
| BR-CO-10 | Bloquant | `totals.sum_invoice_lines_amount` = Σ `lines.net_amount` |
| BR-CO-13 | Bloquant | `total_without_vat` = `sum_invoice_lines_amount` − `sum_allowances_amount` + `sum_charges_amount` |
| BR-S-08 | Bloquant | Pour chaque entrée `S` : base = Σ lignes de ce taux − remises + frais de ce taux |
| Somme des bases | Bloquant | Σ `vat_category_taxable_amount` = `total_without_vat` |
| BR-S-09 | Bloquant | Pour chaque entrée `S` : TVA = base × taux, arrondie au centime |
| BR-CO-14 | Bloquant | Σ `vat_category_tax_amount` = `total_vat_amount.value` |
| BR-CO-15 | Bloquant | `total_with_vat` = `total_without_vat` + `total_vat_amount.value` |
| BR-CO-16 | Bloquant | `amount_due_for_payment` = `total_with_vat` − `paid_amount` (0 si absent) |
| **BR-O-11** | **Avertissement** | Une entrée `O` coexiste avec une autre catégorie. Attendu avec pourboire ou bonus en lignes (§5.6) |
| STAIRLING-MOTIF-EXONERATION | Avertissement | Chaque entrée `AE`, `O`, `E` porte `vat_exemption_reason_code` |
| STAIRLING-DEVISE | Bloquant | `totals.total_vat_amount.currency_code` = `currency_code` |
| STAIRLING-CLASSIFICATION | Bloquant | Chaque ligne a une `category` de vente ; `AUTRE` bloque jusqu'à revue humaine ; `POURBOIRE` et `PRIME_PLATEFORME` sont en catégorie TVA `O` |
| STAIRLING-COURSE-SUM | Bloquant | Par taux, `vat_break_down` = somme des faits des `stairling.activity_ids` |
| STAIRLING-DATES | Bloquant | `delivery_date` ou `invoicing_period` présent, pas les deux ; `start_date` ≤ `end_date` ; la date d'exécution n'est pas postérieure à `issue_date` ; les dates des courses tombent à `delivery_date` ou dans la période |
| STAIRLING-DIRECTION | Bloquant | SIREN vendeur = SIREN de Stairling Union, ou d'un chauffeur de la coopérative avec `stairling.plateforme` émettrice sous mandat |
| STAIRLING-TVA-VENDEUR | Avertissement | Si une ligne est `S` : `seller.vat_identifier` présent (BR-S-02) et égal à celui de Stairling Union (`FR10928978279`) ou du chauffeur vendeur |
| STAIRLING-AVOIR | Bloquant | Pour `AVOIR_VENTE` : `type_code` = `381` et `preceding_invoice_references` renseigné ; pour `FACTURE_VENTE` : `type_code` ≠ `381` |
| STAIRLING-AVOIR-ORIGINE | Attente puis bloquant | La facture citée existe dans le store (même plateforme) au statut `VALIDE` |
| STAIRLING-IDEMPOTENCE | — | Un événement dont l'`event_id` existe déjà est ignoré (pas rejeté) ; une même `invoice_key` avec un `invoice` différent part en revue |

`STAIRLING-TOTAL-COLLECTED` (format pivot) ne s'applique plus : le pourboire est dans les totaux de la facture.

Tous les contrôles bloquants passent : nouvel événement au statut `VALIDE`. Un contrôle bloquant échoue : statut `REJETE` avec l'écart, aucune écriture produite.

## 8. Exemples

### 8.1 Facture avec pourboire et bonus

Fichier complet : `STAIRLING_Event_FACTURE_VENTE_exemple_pourboire_bonus_v001_draft_4.json`. Course du 6 novembre, facture émise le 7 par Uber au nom de Stairling Union, client professionnel.

| Ligne | Libellé | HT | TVA | `category` |
|---|---|---|---|---|
| 1 | Prix du service de transport | 27,27 | S 10 % → 2,73 | `COURSE` |
| 2 | Supplément aéroport | 5,00 | S 20 % → 1,00 | `SUPPLEMENT_COURSE` |
| 3 | Pourboire | 3,00 | O hors champ | `POURBOIRE` |
| 4 | Bonus quête | 5,00 | O hors champ | `PRIME_PLATEFORME` |
| | **Totaux** | **40,27** | **3,73** | **TTC 44,00** |

```json
{
  "seq": 104527,
  "event_id": "3df9248b-3144-50d4-9054-7fc7932e3ba1",
  "tenant_id": "stairling-union",
  "stream_id": "ES-0042",
  "stream_version": 52,
  "event_type": "FACTURE_VENTE",
  "schema_version": 3,
  "occurred_at": "2026-11-07T00:00:00Z",
  "recorded_at": "2026-11-07T09:14:22Z",
  "document_id": "d4153234-2097-5acb-8f3b-2a5579f8b903",
  "invoice_key": "stairling-union|928978279|UBER-FR-2026-118240|380",
  "idempotency_key": "stairling-union|928978279|UBER-FR-2026-118240|380|RECU",
  "correlation_id": "48b5608c-c631-5b10-8513-850ac3dbb90c",
  "causation_id": null,
  "actor": "api:uber",
  "integrity": {
    "canonicalization": "JCS-RFC8785",
    "algorithm": "sha256",
    "chain_scope": "tenant",
    "payload_hash": "5fb64052f04dc1f1e4c48b224485a319ebb672b956cbe0279eb94d7a52c16c47",
    "prev_hash": "f09127f1f9f306f896549c7d229ed982156690d2500d8ce7e98809b9cfec5e87",
    "hash": "97f6c99793f6178b8e9a6dc54e7765a393d442639c11bd5fe0808ad2543c1856"
  },
  "payload": {
    "numeric_encoding": {
      "representation": "scaled_integer",
      "scale": 2
    },
    "statut": "RECU",
    "invoice": {
      "number": "UBER-FR-2026-118240",
      "issue_date": "2026-11-07",
      "type_code": "380",
      "currency_code": "EUR",
      "delivery_date": "2026-11-06",
      "process_control": {
        "specification_identifier": "urn:cen.eu:en16931:2017"
      },
      "notes": [
        {
          "note": "Facture établie au nom et pour le compte de STAIRLING UNION par Uber B.V."
        }
      ],
      "seller": {
        "name": "STAIRLING UNION",
        "legal_registration_identifier": {
          "scheme": "0002",
          "value": "928978279"
        },
        "vat_identifier": "FR10928978279",
        "postal_address": {
          "address_line1": "5 RUE Pleyel",
          "post_code": "93200",
          "city": "Saint-Denis",
          "country_code": "FR"
        }
      },
      "buyer": {
        "name": "Exemple Conseil SAS",
        "legal_registration_identifier": {
          "scheme": "0002",
          "value": "123456782"
        },
        "postal_address": {
          "country_code": "FR"
        }
      },
      "third_party_biller": {
        "name": "Uber B.V.",
        "vat_identifier": "NL852071589B01",
        "postal_address": {
          "address_line1": "Burgerweeshuispad 301",
          "post_code": "1076 HR",
          "city": "Amsterdam",
          "country_code": "NL"
        }
      },
      "lines": [
        {
          "identifier": "1",
          "invoiced_quantity": 100,
          "invoiced_quantity_code": "C62",
          "net_amount": 2727,
          "price_details": {
            "item_net_price": 2727
          },
          "item_information": {
            "name": "Prix du service de transport"
          },
          "category": "COURSE",
          "vat_information": {
            "invoiced_item_vat_category_code": "S",
            "invoiced_item_vat_rate": 1000
          }
        },
        {
          "identifier": "2",
          "invoiced_quantity": 100,
          "invoiced_quantity_code": "C62",
          "net_amount": 500,
          "price_details": {
            "item_net_price": 500
          },
          "item_information": {
            "name": "Supplément aéroport"
          },
          "category": "SUPPLEMENT_COURSE",
          "vat_information": {
            "invoiced_item_vat_category_code": "S",
            "invoiced_item_vat_rate": 2000
          }
        },
        {
          "identifier": "3",
          "invoiced_quantity": 100,
          "invoiced_quantity_code": "C62",
          "net_amount": 300,
          "price_details": {
            "item_net_price": 300
          },
          "item_information": {
            "name": "Pourboire"
          },
          "category": "POURBOIRE",
          "vat_information": {
            "invoiced_item_vat_category_code": "O",
            "invoiced_item_vat_rate": 0
          }
        },
        {
          "identifier": "4",
          "invoiced_quantity": 100,
          "invoiced_quantity_code": "C62",
          "net_amount": 500,
          "price_details": {
            "item_net_price": 500
          },
          "item_information": {
            "name": "Bonus quête"
          },
          "category": "PRIME_PLATEFORME",
          "vat_information": {
            "invoiced_item_vat_category_code": "O",
            "invoiced_item_vat_rate": 0
          }
        }
      ],
      "vat_break_down": [
        {
          "vat_category_code": "S",
          "vat_category_rate": 1000,
          "vat_category_taxable_amount": 2727,
          "vat_category_tax_amount": 273
        },
        {
          "vat_category_code": "S",
          "vat_category_rate": 2000,
          "vat_category_taxable_amount": 500,
          "vat_category_tax_amount": 100
        },
        {
          "vat_category_code": "O",
          "vat_category_rate": 0,
          "vat_category_taxable_amount": 800,
          "vat_category_tax_amount": 0,
          "vat_exemption_reason_code": "VATEX-EU-O",
          "vat_exemption_reason": "Hors champ de la TVA : pourboire et bonus"
        }
      ],
      "totals": {
        "sum_invoice_lines_amount": 4027,
        "total_without_vat": 4027,
        "total_vat_amount": {
          "value": 373,
          "currency_code": "EUR"
        },
        "total_with_vat": 4400,
        "amount_due_for_payment": 4400
      }
    },
    "stairling": {
      "plateforme": "UBER",
      "activity_ids": [
        "UBER-8841"
      ],
      "rattachement": {
        "worker_id": "ES-0042",
        "person_uuid": "3d9b7f02-5c1e-4a8b-b6e2-91f0c4a7d218",
        "platform_driver_id": "a7f3c2e1-uber-drv-5521",
        "link_method": "platform_driver_id"
      },
      "principal": {
        "name": "Flotte Exemple VTC SAS",
        "siren": "812345678"
      },
      "buyer_type": "B2B",
      "pivot": {
        "format": "urn:stairling:ocr-invoice",
        "format_version": "1.0.0"
      },
      "source": {
        "sha256": "89ae2318276169bd116cceae3ac2b49e243f59e186b1910c8ebef62eaf09f442",
        "media_type": "application/pdf",
        "file_name": "UBER-FR-2026-118240.pdf",
        "page_count": 1
      }
    }
  }
}
```

Contrôles : 2727 + 500 + 300 + 500 = 4027 (BR-CO-10, BR-CO-13) ; 2727 × 10 % = 273 et 500 × 20 % = 100 (BR-S-09) ; 2727 + 500 + 800 = 4027 (somme des bases) ; 273 + 100 + 0 = 373 (BR-CO-14) ; 4027 + 373 = 4400 (BR-CO-15, BR-CO-16). BR-O-11 : avertissement (entrées `S` et `O`).

Dates : course le 6, facture émise et récupérée le 7 : les faits sont datés du 6 et la facture va à la **régularisation du 10** (voir `STAIRLING_Processus_Traitement_Facture_Vente_v002.md`).

Faits produits à la validation (datés du 6 novembre) :

| Fait | Catégorie | Taux | Montant |
|---|---|---|---|
| `CA_BRUT` | `COURSE` | 10 % | 2727 |
| `CA_BRUT` | `SUPPLEMENT_COURSE` | 20 % | 500 |
| `POURBOIRE_ENCAISSE` | `POURBOIRE` | O | 300 |
| `PRIME_PLATEFORME` | `PRIME_PLATEFORME` | O | 500 |
| `TVA_COLLECTEE` | — | 10 % | 273 |
| `TVA_COLLECTEE` | — | 20 % | 100 |

### 8.2 Avoir sur le bonus

Fichier complet : `STAIRLING_Event_AVOIR_VENTE_exemple_bonus_v001_draft_4.json`. Le 9 novembre, Uber annule le bonus de 5,00 €.

```json
"event_type": "AVOIR_VENTE",
"invoice_key": "stairling-union|928978279|UBER-FR-2026-118310|381",
"idempotency_key": "stairling-union|928978279|UBER-FR-2026-118310|381|RECU",
"payload": {
  "invoice": {
    "number": "UBER-FR-2026-118310",
    "issue_date": "2026-11-09",
    "type_code": "381",
    "delivery_date": "2026-11-06",
    "preceding_invoice_references": [ { "reference": "UBER-FR-2026-118240", "issue_date": "2026-11-07" } ],
    "lines": [
      { "identifier": "1", "net_amount": 500, "item_information": { "name": "Annulation bonus quête" },
        "category": "PRIME_PLATEFORME",
        "vat_information": { "invoiced_item_vat_category_code": "O", "invoiced_item_vat_rate": 0 }, "…": "…" }
    ],
    "totals": { "total_with_vat": 500, "…": "…" },
    "…": "…"
  },
  "stairling": { "…": "…" }
}
```

Les montants d'un avoir sont **positifs** : c'est `type_code` = `381` qui indique l'avoir, la comptabilisation inverse le sens. `delivery_date` reste la date de la course corrigée.

## 9. Comptabilité et export

**Faits produits à la validation** (datés de la date d'exécution)

| Fait | Regroupement | Contenu |
|---|---|---|
| `CA_BRUT` | un par couple `category` × taux, pour `COURSE`, `SUPPLEMENT_COURSE`, `FRAIS_ANNULATION` | Σ `net_amount` des lignes du couple, après imputation des remises et frais globaux du taux |
| `POURBOIRE_ENCAISSE` | un par facture, si une ligne `POURBOIRE` | Σ des lignes `POURBOIRE` ; compte de pourboires, hors chiffre d'affaires |
| `PRIME_PLATEFORME` | un par facture, si une ligne `PRIME_PLATEFORME` | Σ des lignes `PRIME_PLATEFORME` |
| `TVA_COLLECTEE` | un par entrée `S` de `vat_break_down` | `vat_category_tax_amount` ; aucun pour `O`, `E`, `Z` |

Les faits `POURBOIRE_ENCAISSE` et `PRIME_PLATEFORME` sont une proposition (§11) ; leur compte comptable est donné par les règles comptables.

**Export vers un tiers** (logiciel comptable, plateforme agréée) : le bloc `invoice` est transformé ainsi :

1. lignes dont la `category` est marquée « Non » au §5.6 retirées, et `vat_break_down` / `totals` recalculés ;
2. nombres convertis en décimal (entier ÷ 100) ;
3. `category` retiré des lignes ;
4. acheteur `B2C` complété depuis le JSON pivot (BT-44) ;
5. le résultat est validé par le schéma EN 16931 du format pivot (variante décimale) et par les règles BR (dont BR-O-11).

## 10. Schéma JSON du payload

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:stairling:event:FACTURE_VENTE:3",
  "type": "object",
  "required": ["numeric_encoding", "statut", "invoice", "stairling"],
  "additionalProperties": false,
  "properties": {
    "numeric_encoding": { "$ref": "#/$defs/NumericEncoding" },
    "statut":   { "enum": ["RECU", "VALIDE", "REJETE", "COMPTABILISE", "REMPLACE"] },
    "controle": { "$ref": "#/$defs/RapportControle" },
    "motif":    { "type": "string", "description": "Obligatoire si statut = REJETE" },
    "ecriture": { "$ref": "#/$defs/Ecriture" },

    "invoice": {
      "type": "object",
      "description": "Structure EN 16931 (sérialisation en_invoice du format pivot) ; seul ajout : lines[].category",
      "required": ["number", "issue_date", "type_code", "currency_code", "process_control",
                   "seller", "buyer", "third_party_biller", "lines", "vat_break_down", "totals"],
      "properties": {
        "number":        { "type": "string", "description": "BT-1" },
        "issue_date":    { "$ref": "#/$defs/Date", "description": "BT-2" },
        "type_code":     { "enum": ["380", "381", "384"], "description": "BT-3" },
        "currency_code": { "$ref": "#/$defs/Devise", "description": "BT-5" },
        "delivery_date": { "$ref": "#/$defs/Date", "description": "BT-72, une course" },
        "invoicing_period": {
          "type": "object", "description": "BG-14, plusieurs courses",
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
          "type": "object", "description": "BG-4, Stairling ou chauffeur de la coopérative",
          "required": ["name", "legal_registration_identifier", "postal_address"],
          "properties": {
            "name": { "type": "string", "description": "BT-27" },
            "legal_registration_identifier": { "$ref": "#/$defs/Identifiant", "description": "BT-30 (0002 = SIREN)" },
            "identifiers": { "type": "array", "items": { "$ref": "#/$defs/Identifiant" }, "description": "BT-29" },
            "vat_identifier": { "type": "string", "description": "BT-31, requis si une ligne est S (STAIRLING-TVA-VENDEUR)" },
            "postal_address": { "$ref": "#/$defs/Adresse", "description": "BG-5" }
          }
        },
        "buyer": {
          "type": "object", "description": "BG-7 ; en B2C, seul postal_address.country_code est écrit",
          "required": ["postal_address"],
          "properties": {
            "name": { "type": "string", "description": "BT-44" },
            "legal_registration_identifier": { "$ref": "#/$defs/Identifiant", "description": "BT-47" },
            "vat_identifier": { "type": "string", "description": "BT-48" },
            "postal_address": { "$ref": "#/$defs/Adresse", "description": "BG-8" }
          }
        },
        "third_party_biller": {
          "type": "object", "description": "Mandataire émetteur (repris du format pivot)",
          "required": ["name"],
          "properties": {
            "name": { "type": "string" },
            "vat_identifier": { "type": "string" },
            "identifiers": { "type": "array", "items": { "$ref": "#/$defs/Identifiant" } },
            "postal_address": { "$ref": "#/$defs/Adresse" }
          }
        },
        "lines": {
          "type": "array", "minItems": 1, "description": "BG-25, telles qu'imprimées (pourboire et bonus compris)",
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
              "category": { "$ref": "#/$defs/CategorieVente" },
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
          "type": "object", "description": "BG-22, tels qu'imprimés",
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
        { "oneOf": [ { "required": ["delivery_date"] }, { "required": ["invoicing_period"] } ] }
      ]
    },

    "stairling": {
      "type": "object",
      "required": ["plateforme", "activity_ids", "rattachement", "buyer_type", "pivot", "source"],
      "additionalProperties": false,
      "properties": {
        "plateforme": { "$ref": "#/$defs/Plateforme" },
        "activity_ids": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
        "rattachement": {
          "type": "object",
          "required": ["worker_id", "link_method"],
          "additionalProperties": false,
          "properties": {
            "worker_id":    { "type": "string" },
            "person_uuid":        { "type": "string", "format": "uuid" },
            "platform_driver_id": { "type": "string" },
            "link_method":        { "enum": ["platform_driver_id", "activity_id", "manual"] }
          }
        },
        "principal": {
          "type": "object", "required": ["name"],
          "properties": {
            "name":  { "type": "string" },
            "siren": { "type": "string", "pattern": "^[0-9]{9}$" }
          }
        },
        "buyer_type":    { "enum": ["B2C", "B2B"] },
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
      "then": { "required": ["motif"] } },
    { "if":   { "properties": { "stairling": { "properties": { "buyer_type": { "const": "B2B" } } } } },
      "then": { "properties": { "invoice": { "properties": { "buyer": { "required": ["name", "legal_registration_identifier"] } } } } } }
  ],

  "$defs": {
    "NumericEncoding": {
      "type": "object", "required": ["representation", "scale"], "additionalProperties": false,
      "properties": { "representation": { "const": "scaled_integer" }, "scale": { "const": 2 } }
    },
    "Date":    { "type": "string", "format": "date" },
    "Devise":  { "type": "string", "pattern": "^[A-Z]{3}$" },
    "Montant": { "type": "integer", "description": "Centimes (échelle 2)" },
    "Taux":    { "type": "integer", "description": "Échelle 2 : 1000 = 10,00 %" },
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
    "Plateforme":   { "enum": ["UBER", "BOLT", "HEETCH", "FREENOW"] },
    "CategorieTVA": { "enum": ["S", "AE", "O", "E", "Z"], "description": "BT-118 / BT-151" },
    "CategorieVente": {
      "enum": ["COURSE", "SUPPLEMENT_COURSE", "FRAIS_ANNULATION", "POURBOIRE", "PRIME_PLATEFORME", "AUTRE"],
      "description": "Liste STAIRLING, catégories de vente (version 1 + POURBOIRE)"
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
        "journal":       { "type": "string", "examples": ["VT-UBER"] },
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
| 3 | Pourboire et bonus en lignes | Écart assumé : BR-O-11 en avertissement. Contredit la décision du 28/10/2026 du format pivot (§4.3) | Aligner le format pivot : pourboire en ligne, suppression de `stairling:platform.tips` et de `STAIRLING-TOTAL-COLLECTED`, ajout de `POURBOIRE` à `stairling:classification` |
| 4 | Traitement TVA du bonus | Saisi en `O` d'après l'impression du mandataire | Valider avec l'expert-comptable |
| 5 | Acheteur B2C sans nom | Écart assumé (BT-44) pour la protection des données ; rétabli à l'export depuis le pivot | — |
| 6 | `third_party_biller` | Repris du format pivot ; n'est pas un terme du noyau EN 16931 | Confirmer son équivalent dans la norme ou l'extension française |
| 7 | BR-O-02 | Une facture avec une ligne `O` ne devrait pas porter de numéro de TVA vendeur ou acheteur (à vérifier dans le texte de la norme) | Vérifier ; si confirmé, contrôle en avertissement comme BR-O-11 |
| 8 | Nom de BT-72 | Décidé le 10/11/2026 : `delivery_date` à la racine de `invoice` (nom STAIRLING, repris de la v001). Absent du schéma du format pivot | Ajouter `delivery_date` (BT-72) au schéma du pivot |
| 9 | Faits `POURBOIRE_ENCAISSE`, `PRIME_PLATEFORME` | Proposition | Valider avec les règles comptables |
| 10 | Espace de noms UUID v5 | Provisoire (`urn:stairling:event-store`) | Fixer la valeur officielle |
| 11 | Requêtes SQL des processus | Chemins à mettre à jour : `payload->>'delivery_date'` devient `payload->'invoice'->>'delivery_date'`, `payload->>'course_ids'` devient `payload->'stairling'->'activity_ids'`, etc. | Mettre à jour `STAIRLING_Processus_Traitement_Facture_Vente_v002.md`. Contrôles : fait dans `STAIRLING_Controle_Facture_v001_draft_2.md` |
| 12 | Retour au même statut | `idempotency_key` = `invoice_key` \| statut : une facture ne peut pas repasser deux fois par le même statut (ex. VALIDE → REJETE → VALIDE) | Si ce cas existe, ajouter `document_id` ou un compteur à `idempotency_key` |
