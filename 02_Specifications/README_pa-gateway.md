# pa-gateway — passerelle Stairling Enterprise ↔ SuperPDP (Go)

Service Go qui porte, pour tous les tenants de Stairling Enterprise, le raccordement à la plateforme agréée SuperPDP, l'émission asynchrone des factures, le suivi de leur cycle de vie et la réception des factures fournisseurs.

Stairling Enterprise n'appelle jamais SuperPDP directement. Il parle à la passerelle par une API interne, et la passerelle gère les jetons, la file de jobs, les reprises et les preuves.

```
Stairling Enterprise ──API interne──▶ pa-gateway ──HTTPS/OAuth──▶ SuperPDP
                                        │
                                        └── PostgreSQL : données, file de jobs, verrous
```

Dépendances : la bibliothèque standard Go (≥ 1.22) et un driver PostgreSQL (`lib/pq`, remplaçable par `pgx/v5/stdlib`, car le code n'utilise que `database/sql`).

## Démarrer

```bash
cp .env.example .env            # renseigner les variables
export $(grep -v '^#' .env | xargs)
go run ./cmd/pa-gateway         # applique le schéma, lance l'API et les workers
```

Tests (unitaires + intégration contre un vrai PostgreSQL et un faux SuperPDP) :

```bash
TEST_DATABASE_URL="postgres://pa:pa@localhost/pa_test?sslmode=disable" go test -race -p 1 ./...
```

## Organisation

| Paquet | Rôle |
| --- | --- |
| `cmd/pa-gateway` | Binaire : API HTTP + workers + garde-fou de planification |
| `internal/superpdp` | Client HTTP : erreurs typées, limiteur de débit, mapping des statuts |
| `internal/oauth` | PKCE (S256), URL d'autorisation, dérivation SIREN |
| `internal/tokens` | Jeton frais par tenant : refresh proactif, sérialisé, rotation persistée |
| `internal/enrollment` | Raccordement : lancement, callback, vérification KYB, machine à états |
| `internal/eninvoice` | Modèle EN 16931, validateur local (BR, BR-CO, BR-FR), traduction vers SuperPDP |
| `internal/emission` | Jobs `send` (dépôt) et `payment` (fr:212) |
| `internal/tracking` | Job `sync` par tenant : événements, suivi, réception ; se replanifie |
| `internal/reception` | 4 passes à curseur, coffre des natifs, décisions fr:205 / fr:210 |
| `internal/queue` | File de jobs PostgreSQL (`SKIP LOCKED`) : retry, snooze, cancel, unicité |
| `internal/store` | Accès SQL ; `migrations/` : schéma |
| `internal/secret`, `internal/logx`, `internal/vault` | Chiffrement AES-256-GCM, logs en liste blanche, coffre |
| `internal/fakepdp`, `integration/` | Faux SuperPDP et tests d'intégration |

## 1. Enrôlement

`POST /v1/tenants/{id}/connection/authorize` avec `siret` et `login_email` renvoie l'URL de consentement. Stairling Enterprise y redirige l'utilisateur ; SuperPDP le renvoie sur `GET /oauth/callback`, puis la passerelle le redirige vers `PA_APP_RETURN_URL?tenant_id=…&result=…`.

```
disconnected ──consentement──▶ pending_verification ──KYB verified──▶ connected
      ▲                                                              │
      └────────── déconnexion ◀───── reconnect_required ◀──invalid_grant
```

Ce qui est garanti :

- **Prérequis contrôlés côté serveur.** SIRET à 14 chiffres (on en dérive le SIREN) et email valide.
- **`state` anti-CSRF.** Usage unique, valable 15 minutes, consommé même en cas de refus.
- **Secrets chiffrés au repos.** Le verifier PKCE et les jetons sont stockés en AES-256-GCM.
- **Sortie de `pending_verification`.** L'état ne passe à `connected` qu'avec `company_verification_status = verified`. Le bouton « Revérifier » appelle `POST …/connection/verify`.
- **Synchro planifiée d'office.** Le passage à `connected` planifie automatiquement la synchro du tenant.
- **Refresh sérialisé par tenant.** Il passe par un verrou consultatif PostgreSQL, avec relecture après verrou. Le refresh token tourne à chaque appel : le test `TestRefreshIsSerializedAndRotationPersisted` lance 10 workers concurrents et vérifie qu'un seul refresh part.

**Raccordé n'est pas transmettre.** Il faut aussi poser `emission_enabled_from` (`PUT …/connection/enablement`). Une facture datée d'avant cette ouverture est refusée (`409 out_of_scope`) et n'est jamais rattrapée.

## 2. Émission asynchrone

`POST /v1/tenants/{id}/invoices` avec `external_id` et `invoice` (modèle EN 16931) enregistre la facture et met le job `send` en file, dans la même transaction. La réponse `202` contient le résultat du contrôle local (`findings`).

Le job `send` enchaîne :

1. le contrôle local ;
2. la vérification de l'état du raccordement et du périmètre ;
3. l'obtention d'un jeton frais ;
4. `POST /invoices/convert` (JSON → Factur-X) ;
5. `POST /invoices?external_id=…` (dépôt) ;
6. l'enregistrement, en une transaction, de l'identifiant plateforme et du premier statut.

| Nature | Cause | Plafond de 5 | Reprise |
| --- | --- | --- | --- |
| `invalid` | contrôle local KO | compte | job annulé ; la resoumission corrigée relance |
| `refused` | 400/422 + règles `BR-*` | compte | retry avec backoff |
| `blocked` | 401, 403, KYB, reconnexion | ne compte pas | snooze 1 h |
| `failed` | 5xx, 429, timeout, TLS | ne compte pas | snooze croissant, sans limite |
| `exhausted` | plafond atteint | — | resoumettre pour relancer (compteur remis à zéro) |

**Idempotence.** Une facture qui a un `pdp_invoice_id` ne repart jamais (`409 already_transmitted`). Le client HTTP ne rejoue jamais un POST de lui-même.

**Encaissement.** `POST …/invoices/{external_id}/payment` met en file le job `payment`, qui envoie `fr:212`. Le job est rejouable et sans effet si le statut 212 est déjà enregistré.

## 3. Suivi et réception

Le job `sync` d'un tenant tourne toutes les heures et se replanifie lui-même. Un garde-fou, toutes les 5 minutes, recrée la chaîne si elle s'est rompue. Chaque tick enchaîne :

1. **Événements** (`GET /invoice_events`). Cette passe n'est jamais coupée : elle porte aussi les refus et rejets de nos factures émises. Un code inconnu est historisé brut sans écraser le statut courant.
2. **Filet de sécurité.** Relecture des factures émises encore en vol.
3. **Si la réception est activée :**
   - factures reçues (`GET /invoices?direction=in`, `expand[]=en_invoice,events`) ;
   - détail complet ;
   - fichier natif, déposé au coffre avec son SHA-256.

Les curseurs sont typés `BIGINT`, n'avancent qu'après commit et ne reculent jamais. Le test de réception utilise des identifiants 9, 10 et 100 pour piéger un tri lexicographique.

Stairling Enterprise lit les factures reçues avec `GET …/inbound?after=`. Il transmet la décision de l'acheteur avec `POST …/inbound/{pdp_id}/decision` : `approved`, ou `refused` avec un `reason_code` obligatoire. La décision est irréversible et envoyée par un job rejoué jusqu'au succès.

## À aligner sur la spec SuperPDP avant la production

Ce code a été testé contre un **faux** SuperPDP construit à partir de la documentation interne du projet. Les points suivants doivent être confrontés à l'OpenAPI officielle (`v1.beta`, téléchargeable depuis la documentation SuperPDP). Idéalement, générez les types avec `oapi-codegen` :

1. **`internal/eninvoice/mapping.go`** : les noms de clés du JSON `en_invoice`. C'est le seul fichier à retoucher ; le valider par un aller-retour en bac à sable.
2. **Forme des réponses de liste.** Le code suppose `{"data": [...]}` et arrête la pagination quand une page est incomplète.
3. **Corps de `POST /invoice_events`.** À vérifier : le champ `details`, le montant encaissé pour `fr:212`, le code motif pour `fr:210`.
4. **Nouveautés de l'API.** Le statut `fr:220` et le champ `processing_rule` sont apparus en 1.33.0. `fr:220` est déjà accepté et historisé ; sa sémantique (final ou non) reste à confirmer.
5. **Webhooks.** Absents du contrat d'API à ce jour, d'où le polling. S'ils arrivent, un handler HTTP pourra simplement mettre en file un job `sync` immédiat pour le tenant concerné.

## Choix techniques et alternatives

La **file de jobs** maison tient en ~250 lignes et couvre exactement le besoin : mise en file transactionnelle, unicité, snooze sans consommation de tentative. Si l'équipe préfère une bibliothèque, `riverqueue/river` offre la même sémantique ; les handlers n'ont pas à changer.

Le **coffre** est une implémentation fichier pour le dev. En production, implémenter `vault.Store` avec `aws-sdk-go-v2` sur un bucket **versionné**.

Le **schéma** utilise une colonne `tenant_id`. Si Stairling Enterprise garde un schéma PostgreSQL par tenant, les tables peuvent y être créées telles quelles.
