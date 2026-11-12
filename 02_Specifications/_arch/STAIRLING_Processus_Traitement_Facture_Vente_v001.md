# STAIRLING — Processus de traitement d'une facture de vente

| | |
|---|---|
| Document | De la réception d'une facture à son écriture comptable, et suivi des factures en attente |
| Version | v001 — 8 novembre 2026 |
| Auteur | AOUADI Karim |
| Rattachement | `STAIRLING_Event_Payload_FACTURE_VENTE_v001.md`, `STAIRLING_Controle_Facture_v001.md` ; proposition de mise à jour de l'Event Store |

## 1. Vue d'ensemble

Une facture traverse trois services. Chacun **lit** un événement, fait son travail, puis **ajoute** un nouvel événement. Aucun événement n'est jamais modifié.

```
                         Event Store (ajout seul)
                         ────────────────────────
Plateforme ──► ① Ingestion ──► FACTURE_VENTE  statut RECU
                                    │
                                    ▼
               ② Contrôle  ──► FACTURE_VENTE  statut VALIDE ou REJETE
                                    │ (VALIDE seulement)
                                    ▼
               ③ Comptabilisation
                  ├─ chaque soir : factures du jour
                  └─ le 5 de M+1 : factures tardives (régularisation)
                       │
                       ├─ projection : calcule l'écriture
                       ├─ envoi au système comptable
                       ▼
                  ECRITURE_COMPTABILISEE  (nature FACTURE ou REGULARISATION)

Pas de clôture : une facture en retard est reprise par la régularisation suivante.

Suivi : factures VALIDE sans ECRITURE_COMPTABILISEE = en attente de comptabilisation
```

## 2. Les événements produits

| # | Événement | Produit par | `statut` / `nature` | `causation_id` | Ce qu'il dit |
|---|---|---|---|---|---|
| 1 | `FACTURE_VENTE` | Ingestion | `statut` = `RECU` | — | La facture est arrivée |
| 2 | `FACTURE_VENTE` | Contrôle | `statut` = `VALIDE` ou `REJETE` | `event_id` de 1 | La facture est cohérente, ou non |
| 3 | `ECRITURE_COMPTABILISEE` | Comptabilisation | `nature` = `FACTURE` ou `REGULARISATION` | `event_id` de 2 | La facture est passée en comptabilité |

Tous les événements d'une même facture portent le **même `document_id`**. Les événements 1 et 2 ont le **même payload**, seuls `statut`, `controle` et `motif` changent.

## 3. Service ① — Ingestion

| | |
|---|---|
| Déclencheur | Arrivée d'une facture (API plateforme) |
| Entrée | Facture au format pivot |
| Sortie | `FACTURE_VENTE`, `statut` = `RECU` |

```
recevoir la facture
construire le payload FACTURE_VENTE (statut = RECU)
vérifier le schéma JSON du payload
    si KO : ne rien écrire, signaler une erreur d'ingestion
ajouter l'événement FACTURE_VENTE (document_id = nouvel identifiant de la pièce)
```

## 4. Service ② — Contrôle (mise à jour du statut)

| | |
|---|---|
| Déclencheur | Nouvel événement `FACTURE_VENTE` au statut `RECU` ; relance chaque nuit pour celles restées `RECU` |
| Entrée | L'événement `RECU` |
| Sortie | `FACTURE_VENTE`, `statut` = `VALIDE` ou `REJETE` |

```
lire l'événement R (statut RECU)
rapport = contrôler(R.payload)            # règles N2 à N4, voir STAIRLING_Controle_Facture_v001.md
si une règle est en attente (courses pas encore reçues) :
    ne rien écrire ; la facture sera recontrôlée plus tard
sinon :
    payload = copie de R.payload
    payload.statut   = "REJETE" si une règle bloquante échoue, sinon "VALIDE"
    payload.controle = rapport
    payload.motif    = résumé des échecs (si REJETE)
    ajouter FACTURE_VENTE (document_id = R.document_id, causation_id = R.event_id, payload)
```

À l'écriture, le store vérifie que le payload est identique à celui du `RECU`, hors `statut`, `controle` et `motif`.

**Statut actuel d'une facture** = `statut` du dernier événement `FACTURE_VENTE` de son `document_id`.

## 5. Service ③ — Comptabilisation

### 5.1 Quelle facture, quel jour

On compare la **date de la course** (`delivery_date`, ou `invoicing_period.end_date`) à la **date d'émission** (`issue_date`).

| Facture | Condition | Traitée | Écriture datée | `nature` |
|---|---|---|---|---|
| Du jour | `issue_date` = date de la course | Chaque soir | `issue_date` | `FACTURE` |
| Tardive | `issue_date` > date de la course | Le 5 de M+1 : toutes les factures tardives validées et pas encore comptabilisées, dont la course est en M **ou avant** | Dernier jour de M (le mois régularisé) | `REGULARISATION` |

Il n'y a pas de clôture : une facture qui arrive après la régularisation de son mois n'est jamais perdue, elle est reprise par la régularisation suivante. Exemple : une course d'octobre facturée le 8 novembre est comptabilisée le 5 décembre, datée du 30 novembre. Elle est signalée « en retard » (course antérieure au mois régularisé) pour information de la DAF.

### 5.2 Traitement

```
sélectionner les factures à traiter (requête 5.1, jour ou régularisation)
pour chaque facture V (statut VALIDE, sans écriture) :
    # projection : calcul de l'écriture, rejouable
    faits   = CA_BRUT et TVA_COLLECTEE des courses V.payload.course_ids
    lignes  = appliquer la table d'imputation aux faits
              + ligne client 411<PLATEFORME> = V.payload.totals.total_with_vat
    vérifier : total débit = total crédit
        si KO : ne rien écrire, signaler à la DAF
    # enregistrement
    envoyer l'écriture au système comptable (clé d'idempotence = V.event_id)
    ajouter ECRITURE_COMPTABILISEE (document_id = V.document_id,
                                    causation_id = V.event_id,
                                    payload = nature, journal, date, pièce, lignes)
```

**La projection** calcule l'écriture ; elle peut être relancée sans risque. **L'événement `ECRITURE_COMPTABILISEE`** fige l'écriture une fois passée : numéro, date et lignes. Le journal légal et le FEC se lisent à partir de ces événements.

**Pas de doublon** : une seule `ECRITURE_COMPTABILISEE` par `causation_id` (index unique) ; le système comptable ignore une clé d'idempotence déjà reçue.

### 5.3 Exemple de payload `ECRITURE_COMPTABILISEE`

Facture Uber de 39,90 € TTC, course du 6 novembre, émise le 7 (facture tardive) :

```json
{
  "nature": "REGULARISATION",
  "journal": "VT-UBER",
  "ecriture_num": "VT-UBER-2026-000418",
  "ecriture_date": "2026-11-30",
  "piece_ref": "UBER-FR-2026-118204",
  "piece_date": "2026-11-07",
  "periode": "2026-11",
  "imputation_version": 1,
  "lignes": [
    { "compte": "411UBER",  "aux": "UBER",            "debit": 3990, "credit": 0 },
    { "compte": "706 transport 10 %", "analytique": "ES-0042", "debit": 0, "credit": 2700 },
    { "compte": "706 frais annexes 20 %", "analytique": "ES-0042", "debit": 0, "credit": 600 },
    { "compte": "pourboires (à définir)", "debit": 0, "credit": 300 },
    { "compte": "445711",   "debit": 0, "credit": 270 },
    { "compte": "445712",   "debit": 0, "credit": 120 }
  ]
}
```

## 6. Pas de clôture

Aucun mois n'est fermé et aucun événement de clôture n'est produit. La régularisation du 5 de M+1 reprend **toutes** les factures tardives en attente, quel que soit le mois de leur course. Une écriture de régularisation est toujours datée du dernier jour du mois régularisé (M) : on n'écrit jamais dans un mois antérieur, ce qui laisse inchangés les chiffres des mois déjà déclarés (CA3) et payés.

## 7. Suivi des factures validées non comptabilisées

> **En attente de comptabilisation = facture au statut `VALIDE` sans événement `ECRITURE_COMPTABILISEE` pour son `document_id`.**

```sql
SELECT f.document_id,
       f.payload->>'number'        AS numero,
       f.payload->>'issue_date'    AS date_emission,
       coalesce(f.payload->>'delivery_date',
                f.payload->'invoicing_period'->>'end_date') AS date_course,
       CASE WHEN f.payload->>'issue_date' = coalesce(f.payload->>'delivery_date',
                                                     f.payload->'invoicing_period'->>'end_date')
            THEN 'quotidien' ELSE 'régularisation' END     AS traitement_prevu
FROM events f
WHERE f.event_type = 'FACTURE_VENTE'
  AND f.payload->>'statut' = 'VALIDE'
  AND f.document_id NOT IN (SELECT document_id FROM events
                            WHERE event_type = 'ECRITURE_COMPTABILISEE')
ORDER BY date_course;
```

| Situation dans le résultat | Normal ? |
|---|---|
| `quotidien`, validée aujourd'hui | Oui : traitée ce soir |
| `quotidien`, validée avant aujourd'hui | **Non** : le traitement du soir a échoué, à investiguer |
| `régularisation`, course du mois en cours | Oui : traitée le 5 du mois prochain |
| `régularisation`, course d'un mois déjà régularisé | Oui : reprise à la prochaine régularisation, signalée « en retard » |

Cette requête peut être tenue à jour sous forme de table (projection « Suivi comptable ») pour le tableau de bord de la DAF.

## 8. Exemple de bout en bout

Facture Uber `UBER-FR-2026-118204`, course `UBER-8841` du 6 novembre, émise le 7.

| seq | Date | Service | Événement | Statut / nature | causation | Suivi (§7) |
|---|---|---|---|---|---|---|
| 104527 | 07/11 09:14 | Ingestion | `FACTURE_VENTE` | `RECU` | — | Pas encore validée |
| 104530 | 07/11 09:15 | Contrôle | `FACTURE_VENTE` | `VALIDE` | 104527 | **En attente** (régularisation) |
| 118902 | 05/12 02:00 | Comptabilisation | `ECRITURE_COMPTABILISEE` | `REGULARISATION`, datée 30/11 | 104530 | Traitée |

Si la course et la facture avaient eu la même date, la facture aurait été comptabilisée dès le soir du 7 novembre (`nature` = `FACTURE`, datée du 7).

## 9. Points à valider

- « 5 jours après la fin du mois » : jours calendaires (le 5) ou ouvrés.
- Une facture tardive émise dans le même mois que la course attend la régularisation (règle retenue) ou est traitée le jour de son émission.
- Avec l'expert-comptable : dater au dernier jour de M une facture émise en M+1, ou passer par une facture à établir (FAE) avec extourne.
- Une facture en retard (course antérieure au mois régularisé) est datée du dernier jour du mois régularisé, donc sur un autre mois que celui de sa course : à confirmer avec l'expert-comptable (rattachement du chiffre d'affaires).
- Comptes `445712`, pourboires et sous-comptes 706 de la table d'imputation.
