# STAIRLING — Processus de traitement d'une facture de vente

| | |
|---|---|
| Document | De l'arrivée d'une facture dans l'Event Store à l'écriture journalière dans le journal de vente, et suivi de la comptabilisation |
| Version | v002 — 8 novembre 2026 (remplace la v001 : regroupement journalier par chauffeur, statut `COMPTABILISE`, pas de clôture) ; mise à jour du 9 novembre 2026 : `numeric_encoding` dans les payloads, `stream_version` dans l'enveloppe ; calendrier aligné sur la spec draft 2 (comptabilisation à J+1, régularisation le 10 de M+1) |
| Auteur | AOUADI Karim |
| Rattachement | `STAIRLING_Event_Payload_FACTURE_VENTE_v001.md`, `STAIRLING_Controle_Facture_v001.md`, `STAIRLING_Processus_Integration_Pieces_Comptables_v001_draft_2.docx`, note de conception Event Sourcing v002 |

## 1. Vue d'ensemble

Une facture de vente traverse quatre étapes. Chaque étape **lit** un ou plusieurs événements et **ajoute** de nouveaux événements ; aucun événement n'est jamais modifié.

```
① Ingestion          ──► FACTURE_VENTE  statut RECU
② Contrôle           ──► FACTURE_VENTE  statut VALIDE ou REJETE        (même payload)
③ Comptabilisation   ──► ECRITURE_COMPTABILISEE                        (1 par jour × plateforme × chauffeur)
   à J+1             ──► FACTURE_VENTE  statut COMPTABILISE            (1 par facture regroupée)
④ Régularisation     ──► mêmes événements que ③, le 10 de M+1, pour les factures restées VALIDE
```

Le **statut** du payload dit à tout moment où en est la facture :

```
RECU ──② contrôle OK──► VALIDE ──③ ou ④──► COMPTABILISE
  └──② contrôle KO──► REJETE
```

Il n'y a pas de clôture : une facture restée `VALIDE` est toujours reprise par la régularisation suivante.

## 2. Les événements produits

| Étape | Événement ajouté | `stream_id` | `document_id` | `causation_id` | Contenu clé |
|---|---|---|---|---|---|
| ① Ingestion | `FACTURE_VENTE` | chauffeur | la facture | — | `statut` = `RECU` |
| ② Contrôle | `FACTURE_VENTE` | chauffeur | la facture | `event_id` du `RECU` | `statut` = `VALIDE` ou `REJETE`, `controle`, `motif` |
| ③ / ④ Comptabilisation | `ECRITURE_COMPTABILISEE` | chauffeur | — (plusieurs factures) | — | `journal`, `ecriture_date`, `piece_ref`, `factures[]`, `lignes[]` |
| ③ / ④ Comptabilisation | `FACTURE_VENTE` | chauffeur | la facture | `event_id` de l'écriture | `statut` = `COMPTABILISE`, `ecriture` |

`causation_id` contient l'`event_id` de l'événement qui a provoqué celui-ci : il permet de remonter la chaîne jusqu'à la pièce d'origine.

Chaque événement porte aussi, dans l'enveloppe, `stream_version` : sa position dans le flux du chauffeur (1, 2, 3… sans trou). `seq` ordonne tout le store, tous flux confondus ; `stream_version` numérote le seul flux. Le store refuse deux événements avec le même couple (`stream_id`, `stream_version`) : si deux étapes écrivent en même temps dans le flux d'un chauffeur, la seconde relit le flux et réessaie.

Tous les payloads (`FACTURE_VENTE`, `ECRITURE_COMPTABILISEE`) déclarent l'encodage de leurs nombres : `"numeric_encoding": { "representation": "scaled_integer", "scale": 2 }`. Montants en centimes (39,90 € → `3990`), taux × 100 (20 % → `2000`).

## 3. Étape ① — Ingestion

| | |
|---|---|
| Déclencheur | Arrivée d'une facture émise par une plateforme sous mandat |
| Lit | La facture au format pivot |
| Ajoute | `FACTURE_VENTE`, `statut` = `RECU` |

```
construire le payload FACTURE_VENTE (statut = RECU, numeric_encoding = scaled_integer / 2)
vérifier le schéma JSON du payload
    si KO : ne rien écrire ; la pièce reste dans la table documents avec une erreur d'ingestion
ajouter FACTURE_VENTE
    stream_id      = chauffeur (ex. ES-0042)
    stream_version = dernière version du flux + 1
    document_id    = identifiant de la pièce
    occurred_at    = issue_date
```

## 4. Étape ② — Contrôle

| | |
|---|---|
| Déclencheur | Nouvel événement `RECU` ; relance chaque nuit des factures restées `RECU` |
| Lit | `FACTURE_VENTE` au statut `RECU` |
| Ajoute | `FACTURE_VENTE`, `statut` = `VALIDE` ou `REJETE` |

```
rapport = contrôler(RECU.payload)          # règles N2 à N4 (STAIRLING_Controle_Facture_v001.md)
si une donnée manque (courses pas encore reçues) : ne rien écrire, recontrôler plus tard
payload          = copie de RECU.payload
payload.statut   = REJETE si une règle bloquante échoue, sinon VALIDE
payload.controle = rapport
payload.motif    = résumé des échecs (si REJETE)
ajouter FACTURE_VENTE (même document_id, causation_id = RECU.event_id, stream_version = dernière version du flux + 1)
```

Une facture `REJETE` part dans la file de revue de la DAF et ne sera jamais comptabilisée.

## 5. Étape ③ — Comptabilisation journalière à J+1

### 5.1 Principe

Le lendemain de chaque journée (**J+1**), une **projection** calcule le chiffre d'affaires réalisé le jour J **par plateforme et par chauffeur**, à partir des factures validées, et l'enregistre dans le **journal de vente de chaque plateforme** (`VT-UBER`, `VT-BOLT`, `VT-HEETCH`, `VT-FREENOW`).

| Élément | Règle |
|---|---|
| Factures prises | Dernier statut = `VALIDE`, course du jour J (`delivery_date` = J) et facture **récupérée** le jour J (date du `recorded_at` de son `RECU`, heure de Paris) |
| Heure du traitement | J+1, par exemple 6 h (heure de Paris) : à valider |
| Regroupement | Une écriture par **(jour J, plateforme, chauffeur)** |
| Journal | `VT-<PLATEFORME>` |
| Date d'écriture | J (jour de la course), l'écriture étant produite à J+1 |
| Pièce (`piece_ref`) | Récapitulatif journalier : `VT-<PLATEFORME>-<J>-<chauffeur>` (ex. `VT-UBER-2026-11-07-ES-0042`), qui liste les factures |
| Lignes | Somme des `vat_break_down` des factures du groupe, par catégorie et taux de TVA, + ligne client 411 de la plateforme |

Seule la date de récupération compte : la date d'émission (`issue_date`) peut différer de la date de course sans changer la règle. Une facture récupérée après le jour de sa course, ou récupérée le jour même mais validée après le traitement de J+1, reste `VALIDE` : elle est reprise par la régularisation du 10 (§6).

### 5.2 Sélection et regroupement

```sql
-- :jour = J, la veille du traitement
-- 1. Dernier événement de chaque facture
WITH derniers AS (
  SELECT DISTINCT ON (document_id) document_id, event_id, stream_id, payload
  FROM events
  WHERE event_type = 'FACTURE_VENTE'
  ORDER BY document_id, seq DESC
),
-- 2. Date de récupération : date du RECU, heure de Paris
recus AS (
  SELECT document_id, min(recorded_at AT TIME ZONE 'Europe/Paris')::date AS recuperee_le
  FROM events
  WHERE event_type = 'FACTURE_VENTE' AND payload->>'statut' = 'RECU'
  GROUP BY document_id
),
-- 3. Factures validées, course du jour J, récupérées le jour J
a_traiter AS (
  SELECT d.* FROM derniers d JOIN recus r USING (document_id)
  WHERE d.payload->>'statut' = 'VALIDE'
    AND (d.payload->>'delivery_date')::date = :jour
    AND r.recuperee_le = :jour
)
-- 4. Somme par plateforme, chauffeur, catégorie et taux de TVA
SELECT payload->>'plateforme'             AS plateforme,
       stream_id                          AS chauffeur,
       v->>'vat_category_code'            AS categorie,
       (v->>'vat_rate')::int              AS taux,
       sum((v->>'taxable_amount')::int)   AS base_ht,
       sum((v->>'tax_amount')::int)       AS tva
FROM a_traiter, jsonb_array_elements(payload->'vat_break_down') v
GROUP BY plateforme, chauffeur, categorie, taux;
```

La ligne client de chaque groupe = Σ `totals.total_with_vat` de ses factures.

### 5.3 Correspondance avec les comptes (table d'imputation)

| Catégorie / taux | Compte (crédit) |
|---|---|
| S / 10 % | 706 `<plateforme>` transport 10 % |
| S / 20 % | 706 `<plateforme>` frais annexes 20 % |
| O (hors champ) | Compte pourboires (à définir) |
| TVA S / 10 % | 445711 |
| TVA S / 20 % | 445712 |
| Total TTC (débit) | 411`<PLATEFORME>` |

Le chauffeur est porté en analytique sur les lignes de produit. Si une plateforme facture deux natures différentes au même taux, la nature sera lue dans les faits `CA_BRUT` des courses.

### 5.4 Exemple : Uber, 7 novembre 2026

| Chauffeur | Facture | Base 10 % | TVA 10 % | Base 20 % | TVA 20 % | Hors champ | TTC |
|---|---|---|---|---|---|---|---|
| ES-0042 | UBER-FR-2026-118204 | 27,00 | 2,70 | 6,00 | 1,20 | 3,00 | 39,90 |
| ES-0042 | UBER-FR-2026-118230 | 20,00 | 2,00 | — | — | — | 22,00 |
| ES-0057 | UBER-FR-2026-118251 | 15,00 | 1,50 | 4,00 | 0,80 | — | 21,30 |

Deux écritures dans le journal `VT-UBER`, datées du 7 novembre et produites le 8 (J+1) :

| Compte | ES-0042 Débit | ES-0042 Crédit | ES-0057 Débit | ES-0057 Crédit |
|---|---|---|---|---|
| 411UBER | 61,90 | | 21,30 | |
| 706 Uber transport 10 % | | 47,00 | | 15,00 |
| 706 Uber frais annexes 20 % | | 6,00 | | 4,00 |
| Pourboires | | 3,00 | | — |
| 445711 | | 4,70 | | 1,50 |
| 445712 | | 1,20 | | 0,80 |
| **Total** | **61,90** | **61,90** | **21,30** | **21,30** |

### 5.5 Enregistrement : écriture puis marquage des factures

Pour chaque groupe, **dans une même transaction** :

```
vérifier : débit = crédit et ligne 411 = Σ total_with_vat des factures
envoyer l'écriture au système comptable (piece_ref, clé d'idempotence)
ajouter ECRITURE_COMPTABILISEE
    stream_id = chauffeur ; stream_version = dernière version du flux + 1
    payload = numeric_encoding, journal, date, piece_ref, ecriture_num, factures[], lignes[]
pour chaque facture du groupe :
    ajouter FACTURE_VENTE
        même document_id ; causation_id = event_id de l'écriture ; stream_version suivante
        payload = copie du VALIDE ; statut = COMPTABILISE ; ecriture = { event_id, journal, ecriture_num, ecriture_date }
```

Si une étape échoue, rien n'est écrit : les factures restent `VALIDE` et seront reprises au passage suivant.

**Payload de l'écriture de ES-0042 :**

```json
{
  "numeric_encoding": { "representation": "scaled_integer", "scale": 2 },
  "nature": "FACTURE",
  "journal": "VT-UBER",
  "ecriture_num": "VT-UBER-2026-000418",
  "ecriture_date": "2026-11-07",
  "piece_ref": "VT-UBER-2026-11-07-ES-0042",
  "imputation_version": 1,
  "factures": [
    { "document_id": "7c1d0000-0000-4000-8000-000000000001", "number": "UBER-FR-2026-118204", "total_with_vat": 3990 },
    { "document_id": "8e2a0000-0000-4000-8000-000000000002", "number": "UBER-FR-2026-118230", "total_with_vat": 2200 }
  ],
  "lignes": [
    { "compte": "411UBER", "debit": 6190, "credit": 0 },
    { "compte": "706 Uber transport 10 %", "analytique": "ES-0042", "debit": 0, "credit": 4700 },
    { "compte": "706 Uber frais annexes 20 %", "analytique": "ES-0042", "debit": 0, "credit": 600 },
    { "compte": "pourboires", "analytique": "ES-0042", "debit": 0, "credit": 300 },
    { "compte": "445711", "debit": 0, "credit": 470 },
    { "compte": "445712", "debit": 0, "credit": 120 }
  ]
}
```

**Marquage de la facture UBER-FR-2026-118204 (extrait du payload) :**

```json
{
  "statut": "COMPTABILISE",
  "ecriture": {
    "event_id": "d71e0000-0000-4000-8000-000000000418",
    "journal": "VT-UBER",
    "ecriture_num": "VT-UBER-2026-000418",
    "ecriture_date": "2026-11-07"
  },
  "number": "UBER-FR-2026-118204",
  "…": "reste du payload recopié à l'identique"
}
```

## 6. Étape ④ — Régularisation (le 10 de M+1)

| Élément | Règle |
|---|---|
| Jour | Le 10 de M+1 ; c'est un paramètre, modifiable sans changer le reste du traitement |
| Factures prises | **Toutes** les factures dont le dernier statut est `VALIDE` et dont la date de course est en M ou avant : récupérées après le jour de la course, ou récupérées le jour même mais validées après J+1, ou arrivées après une régularisation précédente |
| Regroupement | Une écriture par **(plateforme, chauffeur)** |
| Date d'écriture | Dernier jour de M (jamais un mois antérieur : les mois déjà déclarés en CA3 et payés ne bougent pas) |
| `nature` | `REGULARISATION` |
| Pièce | `VT-<PLATEFORME>-REGUL-<M>-<chauffeur>` |
| Enregistrement | Identique au §5.5 : `ECRITURE_COMPTABILISEE` puis `FACTURE_VENTE` au statut `COMPTABILISE` pour chaque facture |

Une facture dont la course est antérieure à M est signalée « en retard » pour information de la DAF.

**Exemple : facture récupérée en retard (course du 30 octobre)**

| Date | Fait | Statut de la facture |
|---|---|---|
| 30/10 | Course effectuée ; aucune facture récupérée | — |
| 31/10 | Traitement de J+1 : la facture n'est pas là, rien n'est comptabilisé | — |
| 02/11 | Facture récupérée (`RECU`), puis contrôlée (`VALIDE`) | `VALIDE` (en attente) |
| 03/11 → 09/11 | Les traitements de J+1 l'ignorent : elle n'a pas été récupérée le jour de sa course | `VALIDE` (en attente) |
| 10/11 | Régularisation : `ECRITURE_COMPTABILISEE` (`nature` = `REGULARISATION`) datée du 31/10, puis `FACTURE_VENTE` au statut `COMPTABILISE` | `COMPTABILISE` |

## 7. Attributs de suivi de la comptabilisation

### 7.1 Les attributs

| Attribut | Où | Rôle dans le suivi |
|---|---|---|
| `payload.statut` | Dernier `FACTURE_VENTE` de la facture | **`VALIDE` = en attente de comptabilisation ; `COMPTABILISE` = comptabilisée** |
| `payload.ecriture.event_id` | `FACTURE_VENTE` au statut `COMPTABILISE` | Lien vers l'événement `ECRITURE_COMPTABILISEE` |
| `payload.ecriture.journal`, `ecriture_num`, `ecriture_date` | `FACTURE_VENTE` au statut `COMPTABILISE` | Lien direct vers l'écriture du journal de vente et du FEC |
| `causation_id` | `FACTURE_VENTE` au statut `COMPTABILISE` | `event_id` de l'écriture (même valeur que `ecriture.event_id`) |
| `payload.factures[].document_id` | `ECRITURE_COMPTABILISEE` | Lien inverse : les factures regroupées dans l'écriture |
| `payload.piece_ref`, `payload.ecriture_num` | `ECRITURE_COMPTABILISEE` | Lien vers le système comptable (`PieceRef`, `EcritureNum` du FEC) |
| `payload.delivery_date` + `recorded_at` du `RECU` | `FACTURE_VENTE` | Date de course et date de récupération : traitement de J+1 ou régularisation du 10 |
| `recorded_at` | Enveloppe du `VALIDE` | Depuis quand la facture attend |
| `document_id` | Enveloppe | Relie tous les événements d'une même facture |

### 7.2 Règle de suivi

> **Le statut actuel d'une facture est le `statut` de son dernier événement `FACTURE_VENTE`.**
> `VALIDE` = en attente de comptabilisation. `COMPTABILISE` = comptabilisée.

### 7.3 Factures comptabilisées

```sql
WITH derniers AS (
  SELECT DISTINCT ON (document_id) document_id, stream_id, payload
  FROM events WHERE event_type = 'FACTURE_VENTE'
  ORDER BY document_id, seq DESC
)
SELECT stream_id                         AS chauffeur,
       payload->>'plateforme'            AS plateforme,
       payload->>'number'                AS facture,
       payload->'ecriture'->>'journal'      AS journal,
       payload->'ecriture'->>'ecriture_num' AS ecriture,
       payload->'ecriture'->>'ecriture_date' AS date_ecriture
FROM derniers
WHERE payload->>'statut' = 'COMPTABILISE';
```

### 7.4 Factures en attente de comptabilisation

```sql
WITH derniers AS (              -- dernier événement de chaque facture
  SELECT DISTINCT ON (document_id) document_id, stream_id, recorded_at, payload
  FROM events WHERE event_type = 'FACTURE_VENTE'
  ORDER BY document_id, seq DESC
),
recus AS (                      -- date de récupération (heure de Paris)
  SELECT document_id, min(recorded_at AT TIME ZONE 'Europe/Paris')::date AS recuperee_le
  FROM events
  WHERE event_type = 'FACTURE_VENTE' AND payload->>'statut' = 'RECU'
  GROUP BY document_id
)
SELECT d.stream_id                  AS chauffeur,
       d.payload->>'plateforme'     AS plateforme,
       d.payload->>'number'         AS facture,
       d.payload->>'delivery_date'  AS date_course,
       r.recuperee_le,
       d.recorded_at                AS validee_le,
       CASE WHEN r.recuperee_le = (d.payload->>'delivery_date')::date
            THEN 'J+1' ELSE 'régularisation du 10' END AS prise_en_charge
FROM derniers d JOIN recus r USING (document_id)
WHERE d.payload->>'statut' = 'VALIDE'
ORDER BY date_course;
```

| Situation | Normal ? |
|---|---|
| `J+1`, course d'hier, récupérée hier | Oui : comptabilisée au traitement de J+1 |
| `régularisation du 10`, course du mois en cours ou du mois précédent avant le 10 | Oui : comptabilisée à la prochaine régularisation du 10 |
| `régularisation du 10`, course d'un mois déjà régularisé | Oui : reprise à la prochaine régularisation, signalée « en retard » |
| `J+1`, mais le traitement de J+1 est passé alors qu'elle était déjà validée | **Non** : le traitement de son groupe a échoué, à investiguer (elle sera reprise le 10) |

### 7.5 Retrouver le lien dans les deux sens

| Question | Réponse |
|---|---|
| Dans quelle écriture est la facture F ? | `payload.ecriture` de son dernier `FACTURE_VENTE` (statut `COMPTABILISE`) |
| Quelles factures composent l'écriture E ? | `payload.factures[]` de l'`ECRITURE_COMPTABILISEE` E |
| Quelle écriture du FEC correspond ? | `ecriture_num` / `piece_ref` |

## 8. Exemple de bout en bout

Facture `UBER-FR-2026-118204` du chauffeur ES-0042 : course le 7 novembre, facture émise et récupérée le 7 novembre, donc comptabilisée au traitement de J+1 (le 8, vers 6 h, heure à valider).

| seq | `stream_version` | Date | Étape | Événement | `statut` / contenu | `causation_id` | Suivi |
|---|---|---|---|---|---|---|---|
| 104527 | 52 | 07/11 09:14 | ① Ingestion | `FACTURE_VENTE` | `RECU` | — | Pas encore validée |
| 104530 | 53 | 07/11 09:15 | ② Contrôle | `FACTURE_VENTE` | `VALIDE` | 104527 | **En attente** (traitement de J+1) |
| 105210 | 56 | 08/11 06:00 | ③ Comptabilisation | `ECRITURE_COMPTABILISEE` | `VT-UBER-2026-000418`, factures 118204 et 118230 | — | — |
| 105211 | 57 | 08/11 06:00 | ③ Comptabilisation | `FACTURE_VENTE` | `COMPTABILISE`, `ecriture.ecriture_num` = `VT-UBER-2026-000418` | 105210 | **Comptabilisée** |

Les versions 54 et 55 du flux sont la réception et la validation de la facture 118230 ; la version 58, son passage au statut `COMPTABILISE`.

## 9. Points à valider

- Jour fixe de la régularisation : le 10 de M+1 retenu par défaut (paramètre), dans la fenêtre du 5 au 10.
- Heure du traitement de J+1 (ex. 6 h) et fuseau de référence pour la date de récupération : Europe/Paris.
- Avec l'expert-comptable : récapitulatif journalier par chauffeur accepté comme pièce justificative pour le FEC ; datation au dernier jour du mois des factures régularisées ; exigibilité de la TVA sur les encaissements.
- Table d'imputation : comptes 445712, pourboires, sous-comptes 706 par plateforme, analytique ou auxiliaire chauffeur.
- Numérotation `ecriture_num` : attribuée par le logiciel comptable (l'événement est alors écrit après sa réponse) ou par le SIC.
