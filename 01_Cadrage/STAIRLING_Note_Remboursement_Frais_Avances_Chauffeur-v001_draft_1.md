# Remboursement des frais avancés par le chauffeur

| | |
|---|---|
| Référence | NOTE-RFA-001 — v001 draft 1 |
| Date | 17 novembre 2026 |
| Objet | Remboursement d'une dépense payée par le chauffeur avec sa CB personnelle : processus, écritures comptables, compte de contrepartie, et réponses aux questions de l'équipe de développement |
| Rattachement | DEP-001 v002 draft 4 (Principes et guide de traitement des dépenses professionnelles) ; Annexe C du SIC « Frais professionnels » draft 8 ; fiche `STAIRLING_Event_Payload_FACTURE_ACHAT_v001_draft_4.md` ; CESA art. 14 |
| Destinataires | Direction, DAF, comptable interne, expert-comptable, équipe de développement |
| Statut | Document de travail. Les écritures de l'Annexe C restent une proposition soumise à l'expert-comptable (Annexe C § 1.3) |

**En bref.** Quand un chauffeur paie une dépense professionnelle avec sa CB, la coopérative lui doit le montant TTC qu'il a payé. Cette dette est enregistrée au **4211{NOM} – Frais professionnels à rembourser**, jamais au 401. La charge est imputée HT sur son compte d'activité, la TVA est récupérée par la coopérative, et le remboursement est versé avec le salaire dans un virement unique.

## 1. Processus de remboursement

### 1.1 Principe (DEP-001 § 2)

- Le chauffeur est remboursé du **montant TTC** qu'il a réellement payé. Le remboursement lui rend une avance : on n'en retire pas la TVA.
- La coopérative sépare ce montant en deux : une **charge HT**, imputée sur le compte d'activité du chauffeur, et une **TVA déductible** qu'elle récupère.
- Si la facture est au nom du chauffeur au-delà du seuil, la TVA est perdue. Le remboursement reste le même, mais la charge passe en TTC, ce qui réduit sa part variable.
- **Double déduction interdite** (§ 2.1) : le chauffeur ne peut pas déduire cette dépense dans ses frais réels sur sa déclaration de revenus.

### 1.2 Étapes (Annexe C, circuit B)

Le circuit B couvre les dépenses du quotidien : carburant, péages, parking, repas, petites fournitures. C'est la nature de la dépense qui l'impose, le chauffeur ne choisit pas.

1. **Dépôt du justificatif dans l'app.** Jusqu'à 150 € HT, un ticket ou une facture simplifiée suffit, à condition que la TVA y figure (seuil à confirmer par l'expert-comptable). Au-delà, la facture doit être au nom de Stairling Union.
2. **Validation de la note.** Aucune écriture avant validation (SIC § 9.4.1) : automatique, par le comptable interne, ou par la DAF au-delà de 500 €. Le système contrôle les plafonds mensuels par catégorie, la solvabilité (contrôle E7 : charges du mois ≤ enveloppe projetée) et le régime du chauffeur.
3. **Enregistrement (journal JA).** Débit du compte de charge HT et du 44566, crédit du 4211{NOM} pour le TTC. En frais réels, le repas est plafonné à 30 € TTC ; l'excédent reste à la charge du chauffeur, sans rejet de la note.
4. **Clôture de la collecte à J+3** du mois suivant (SIC § 9.6). Une note arrivée après est rattachée au mois suivant.
5. **Bulletin de paie.** Les frais apparaissent après le net à payer, dans la zone « frais remboursés non soumis à cotisations ». Le brut ne change pas.
6. **Virement unique (journal BQ), déclenché uniquement par la DAF.** Il solde le 4210{NOM} (net) et le 4211{NOM} (frais). Le 4211 revient à zéro chaque mois.
7. **Rejet après coup** (doublon, ticket illisible, dépense privée) : contrepassation au journal OD, validée par la DAF.

## 2. Écritures comptables étape par étape

### 2.1 Hypothèses

Chauffeur DUPONT, régime frais réels, novembre 2026. Il paie quatre dépenses avec sa CB personnelle. Le net de salaire du mois est fixé à 1 200,00 € (montant fictif, pour illustrer le virement).

| Pièce | Dépense | TTC | HT | TVA | Conforme ? |
|---|---|---|---|---|---|
| 1 | Carburant (ticket station) | 72,00 | 60,00 | 12,00 (20 %) | Oui |
| 2 | Péage | 12,00 | 10,00 | 2,00 (20 %) | Oui |
| 3 | Repas au restaurant | 35,00, retenu 30,00 | 27,27 | 2,73 (10 %) | Oui, plafonné à 30 € |
| 4 | Fournitures (ticket sans TVA apparente) | 9,60 | 9,60 | — | Non, imputée TTC |

### 2.2 Étape 0 — Paiement par CB

Aucune écriture. La CB du chauffeur est personnelle : le paiement ne passe pas par la banque de la coopérative. La dette envers lui n'existe qu'une fois la note validée.

### 2.3 Étape 1 — Dépôt et validation

Aucune écriture tant que la pièce n'est pas validée. Le système rend deux verdicts séparés : l'un sur la charge, l'autre sur la TVA.

### 2.4 Étape 2 — Enregistrement des notes (journal JA)

Une écriture par pièce. La contrepartie est toujours le 4211DUPONT, pour le TTC remboursé.

**R2a — Carburant**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 6061DUPONT | Carburant — DUPONT | 60,00 | |
| 44566 | TVA déductible 20 % | 12,00 | |
| 4211DUPONT | Frais professionnels à rembourser | | 72,00 |

**R2b — Péage**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 6251DUPONT | Péages et parking — DUPONT | 10,00 | |
| 44566 | TVA déductible 20 % | 2,00 | |
| 4211DUPONT | Frais professionnels à rembourser | | 12,00 |

**R3 — Repas, plafonné à 30 € TTC**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 6257DUPONT | Frais de repas — HT | 27,27 | |
| 44566 | TVA déductible 10 % | 2,73 | |
| 4211DUPONT | Frais professionnels à rembourser | | 30,00 |

Les 5,00 € au-dessus du plafond restent à la charge du chauffeur et ne sont pas enregistrés. La déduction de la TVA sur les repas attend la validation de l'expert-comptable (arbitrage C3) ; à défaut, on passe 6257DUPONT 30,00 sans ligne de TVA.

**R2c — Fournitures, pièce non conforme**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 6064DUPONT | Fournitures véhicule — TTC | 9,60 | |
| 4211DUPONT | Frais professionnels à rembourser | | 9,60 |

Le ticket ne fait pas apparaître la TVA : la dépense est déductible en charge mais pas en TVA. La taxe est perdue et pèse sur l'enveloppe du chauffeur.

Solde du 4211DUPONT : 123,60 € au crédit (72,00 + 12,00 + 30,00 + 9,60).

### 2.5 Étape 3 — Clôture à J+3 et paie

Aucune écriture. Le 4211 est figé, puis la paie est calculée. Le brut ne change pas : le 4211 est un compte de classe 4 et l'enveloppe a déjà supporté les charges. Sur le bulletin, la ligne « Frais remboursés non soumis à cotisations » affiche 123,60 € (contrôle L2).

### 2.6 Étape 4 — Virement unique (journal BQ)

**R6 — Virement du 05/12/2026**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 4210DUPONT | Net à payer novembre 2026 | 1 200,00 | |
| 4211DUPONT | Notes de frais et repas novembre 2026 | 123,60 | |
| 512 | Banque — virement DUPONT | | 1 323,60 |

### 2.7 Étape 5 — Note rejetée après le paiement (journal OD)

Exemple : le péage était un doublon, découvert en revue mensuelle.

**R4 — Contrepassation**

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 4211DUPONT | Annulation note de frais n° [réf] | 12,00 | |
| 6251DUPONT | Péages — annulation | | 10,00 |
| 44566 | TVA déductible — annulation | | 2,00 |

Le remboursement a déjà été versé : le 4211 devient débiteur de 12,00 €, compensés sur les notes du mois suivant.

### 2.8 Étape 6 — Déclaration de TVA (CA3)

Le 44566 porte 16,73 € de TVA (12,00 + 2,00 + 2,73), récupérés sur la CA3 de la coopérative, ou 14,73 € après le rejet du péage.

### 2.9 Contrôles de bouclage (Annexe C § 7.1)

| N° | Vérification | Exemple |
|---|---|---|
| L1 | Total des crédits du 4211 = total des notes validées (HT + TVA) | 123,60 |
| L2 | Ligne du bulletin = solde du 4211 | 123,60 |
| L3 | Virement = net + frais | 1 200,00 + 123,60 = 1 323,60 |
| L4 | 4210 et 4211 à zéro après le virement | 0,00 (hors rejet de l'étape 5) |

Le chauffeur récupère 123,60 € TTC. Son enveloppe ne supporte que 106,87 € : 97,27 € HT pour les pièces avec TVA, plus 9,60 € TTC pour le ticket non conforme. La différence correspond à la TVA récupérée par la coopérative.

## 3. Le compte 4211{NOM}

- **Intitulé** : « Frais professionnels à rembourser », par exemple 4211DUPONT – Frais professionnels à rembourser – DUPONT (Annexe C § 2.2).
- **Rattachement** : subdivision libre de la racine 421 « Personnel – Rémunérations dues », au même titre que le 4210 (salaire).
- **Rôle** : contrepartie de tous les flux de frais versés au chauffeur (notes de frais du circuit B, repas, indemnité kilométrique). Il est soldé chaque mois.
- **Décision** : arbitrage C1 de l'Annexe C, tranché — « 4211{NOM} dédié, journal JA. Le 4210 reste le compte du salaire. »
- **Fonctionnement** : la dette naît à la validation de la note (crédit du 4211) et disparaît au virement (débit du 4211). Un solde créditeur à la clôture signale une note validée non remboursée ; un solde débiteur, un remboursement sans pièce. Les deux sont bloquants.

## 4. Pourquoi aucune écriture entre le 4211 et le 4210

### 4.1 Les deux dettes ne sont pas de même nature

| | 4210DUPONT | 4211DUPONT |
|---|---|---|
| Ce que la coopérative doit | Le salaire net | Le remboursement de l'avance |
| Origine | Le brut, calculé à partir de l'enveloppe | Les notes de frais validées |
| Cotisations | Oui | Non |
| Sur le bulletin | Net à payer | Frais remboursés non soumis à cotisations |

Si on virait le 4211 vers le 4210, les frais passeraient par le compte de salaire. En contrôle, l'URSSAF pourrait y voir un complément de salaire et le réintégrer dans l'assiette des cotisations, avec majorations. Un compte qui ne reçoit que des frais prouve au contraire qu'ils n'ont jamais transité par l'assiette, à condition de ne jamais le mélanger au 4210.

### 4.2 Aucun événement ne justifie un transfert

Le seul événement est le paiement, qui règle les deux dettes en même temps. Le lien entre elles se fait à trois niveaux, sans écriture entre les deux comptes :

- dans le calcul du brut : la note validée débite un compte 6xxx, ce qui réduit l'enveloppe donc le brut, et crédite le 4211 ;
- sur le bulletin : le solde du 4211 apparaît après le net, à titre d'information ;
- au virement : une seule écriture de banque solde les deux comptes.

### 4.3 Sinon, les contrôles de bouclage ne fonctionnent plus

Une écriture D 4211DUPONT / C 4210DUPONT de 123,60 € ferait apparaître 1 323,60 € versés au titre du salaire, alors que le bulletin et la DSN indiquent un net de 1 200,00 €. Les contrôles L3 et L4 ne pourraient plus être vérifiés.

### 4.4 Libellé bancaire

Le relevé ne montre qu'un virement de 1 323,60 €. Le libellé et le fichier de virement doivent porter les deux montants, par exemple `DUPONT NOV2026 – NET 1200,00 – FRAIS 123,60`, pour :

- remonter, en contrôle, du mouvement bancaire à chacune des deux natures (piste d'audit) ;
- rapprocher la banque : une ligne du relevé correspond à deux comptes de tiers ;
- prouver que le montant non cotisé correspond bien au solde du 4211.

### 4.5 Point non tranché

La compensation entre une dette de frais et une dette de salaire, ou une avance en espèces (4280), n'est pas réglée (Annexe C § 7.2, arbitrage C11). Elle est renvoyée à l'avocat en droit social. En attendant, le virement des frais est suspendu à une décision de la DAF.

## 5. Pourquoi pas de compte 401 pour le chauffeur

**En une phrase.** Le 401 note ce que la coopérative doit encore à un fournisseur. Ici, le fournisseur a déjà été payé par la CB du chauffeur : la seule personne à qui la coopérative doit de l'argent, c'est le chauffeur, et cette dette va dans un compte de personnel, le 4211.

**Le chauffeur n'est pas un fournisseur, c'est un salarié.** Il ne vend rien à Stairling : il avance une dépense de la coopérative en tant qu'entrepreneur-salarié (CESA, art. 14). La dette envers lui relève de la classe 42, comme le 4210. En 401, il apparaîtrait comme un prestataire indépendant, ce qui contredit son statut de salarié en CAE.

**Le fournisseur réel est déjà payé.** La coopérative ne doit plus rien à la station. Un 401 « station » serait faux, et un 401 « chauffeur » mélangerait deux natures de dette.

**L'Annexe C l'exclut expressément (§ 2.2).** Le 401 n'est « jamais auxiliarisé : le fournisseur contracte avec Stairling, pas avec le chauffeur ». Un compte du type 4010DUPONT n'est pas prévu.

**Le 4211 alimente la paie, le 401 non.** La ligne du bulletin est lue sur le solde du 4211 (L2) et le virement unique solde ensemble le 4210 et le 4211 (L3). Avec un 401, les frais seraient payés hors de la paie, et la preuve qu'ils sont hors assiette disparaîtrait.

**Comparaison.** Un collègue achète du matériel pour l'entreprise avec sa carte : le magasin est réglé. L'entreprise ne doit plus rien au magasin, elle doit rembourser le collègue.

## 6. Rôle du compte 401

Le 401 « Fournisseurs » enregistre ce que la coopérative doit à un fournisseur qu'elle n'a pas encore payé.

1. À réception de la facture : D 6xxx{NOM} (HT) + D 44566 (TVA) / C 401 (TTC).
2. Au règlement : D 401 / C 512. Le 401 revient à zéro.

Chez Stairling, il sert au **circuit A** : factures récurrentes au nom de Stairling Union (location, assurance, téléphonie, entretien programmé), payées directement par la coopérative. Il n'est jamais suivi par chauffeur : la part du chauffeur est portée par le compte de charge (par exemple 6135DUPONT).

| Compte | La coopérative doit de l'argent à… |
|---|---|
| 401 | un fournisseur qu'elle va payer elle-même |
| 4211{NOM} | un chauffeur qui a avancé une dépense |
| 4210{NOM} | un chauffeur, pour son salaire |

| | Circuit A | Circuit B (paiement CB du chauffeur) |
|---|---|---|
| Qui est le créancier ? | Le fournisseur | Le chauffeur |
| Compte de contrepartie | 401 (sans nom de chauffeur) | 4211{NOM} |
| Naissance de la dette | Enregistrement de la facture | Validation de la note |
| Paiement | Règlement fournisseur | Virement unique avec le salaire |

## 7. Facture au nom de la coopérative payée par le chauffeur

Le chauffeur reste remboursé par le 4211{NOM}. Le nom sur la facture ne décide pas qui la coopérative doit payer : il décide si la TVA est récupérable et à qui appartient le bien acheté.

| Question | Ce qui décide | Réponse |
|---|---|---|
| À qui la coopérative doit-elle de l'argent ? | Qui a payé | Au chauffeur : 4211{NOM} |
| La TVA est-elle récupérable ? | Le nom sur la facture | Oui, quel que soit le montant |
| Combien l'enveloppe supporte-t-elle ? | La récupération de la TVA | Le montant HT |
| À qui appartient un bien durable ? | Le nom sur la facture | À la coopérative (DEP-001 § 6.1) |

**Exemple.** DUPONT, frais réels, fait réparer son véhicule pour 360,00 € TTC (300,00 HT, 60,00 TVA), facture au nom de Stairling Union, payée par CB.

| Compte | Libellé | Débit | Crédit |
|---|---|---|---|
| 6152DUPONT | Entretien et réparations — DUPONT | 300,00 | |
| 44566 | TVA déductible 20 % | 60,00 | |
| 4211DUPONT | Frais professionnels à rembourser | | 360,00 |

| | Facture au nom de Stairling | Facture au nom de DUPONT |
|---|---|---|
| Remboursé au chauffeur (4211) | 360,00 | 360,00 |
| TVA récupérée (44566) | 60,00 | 0, perdue |
| Charge sur l'enveloppe (6152) | 300,00 | 360,00 |

Points de vigilance :

- **Double paiement.** La facture doit être déposée comme note de frais, avec la preuve du paiement (mention « acquittée », ticket CB), et le SIC doit contrôler les doublons (même fournisseur, même numéro, même montant).
- **Bien durable.** Au-delà de 500 € HT (seuil à confirmer), il est immobilisé (D 2183 / C 4211) et amorti sur le compte du chauffeur. Une règle de sortie doit être fixée avant l'achat.
- **Cas non prévu par l'Annexe C.** Une dépense de nature circuit A payée par le chauffeur n'est pas traitée. Règle à ajouter : dès que le chauffeur a payé, le circuit B s'applique.
- **Régime IK.** La réparation ne serait pas remboursée, sauf réparation après un accident en déplacement professionnel (DEP-001 § 5.1, validation manuelle).

## 8. Réponses aux questions de l'équipe de développement

Les points marqués « À arbitrer » demandent une décision.

### 8.1 Périmètre

En V1, uniquement les justificatifs déposés par les chauffeurs (circuit B), seul flux existant. Le modèle reste ouvert (`actor = api:<fournisseur>`, `link_method = card`, `buyer` présent), sans développement maintenant. Ordre proposé ensuite : circuit A (factures au nom de Stairling), puis cartes carburant et API fournisseurs, puis frais de structure.

### 8.2 PAIEMENT_FOURNISSEUR

On ne le produit pas pour une pièce payée par le chauffeur. À la validation, on produit un fait de dette envers le chauffeur (crédit du 4211{NOM} pour le TTC remboursé). Le paiement est le virement de remboursement (R6). Passer par le 401 puis le solder contre le 4211 équilibre les comptes mais fait transiter par le 401 une dette qui n'est pas due à un fournisseur, ce que l'Annexe C exclut.

Le code `48` dit le moyen de paiement, pas qui a payé : c'est `link_method` qui le dit. `PAIEMENT_FOURNISSEUR` reste valable pour le circuit A et pour une carte carburant de la coopérative.

### 8.3 Sens de VALIDE

Deux décisions séparées :

- **VALIDE** = pièce cohérente (lisible, totaux justes, pas de doublon) ;
- **prise en charge** = décision distincte : acceptée, plafonnée ou non prise en charge, avec un motif ;
- **REJETE** = pièce défectueuse (doublon, ticket illisible, dépense privée).

| Cas | Statut | Ce qu'on comptabilise |
|---|---|---|
| Repas à 35 € en frais réels | VALIDE, plafonné | Le montant remboursé : 30 € TTC (27,27 HT en 6257 + 2,73 TVA). Excédent non comptabilisé |
| Carburant, entretien, pneus, assurance ou repas d'un chauffeur au régime IK | VALIDE, non pris en charge | Rien : ni écriture ni remboursement |

On comptabilise toujours le montant remboursé, jamais le montant du ticket.

### 8.4 Catégories

Le tableau de DEP-001 § 5 et § 6 fait foi. On garde l'union des deux listes en séparant ce que DEP-001 sépare.

| Catégorie | Régime IK | Source |
|---|---|---|
| CARBURANT | Inclus, donc refusé | § 5 |
| RECHARGE_ELECTRIQUE | Inclus (« carburant et énergie ») | § 5 |
| ENTRETIEN_REPARATION | Inclus ; réparation après accident en validation manuelle | § 5, § 5.1 |
| PNEUS | Inclus | § 5 |
| CONSOMMABLES (produits de nettoyage, désodorisants) | Inclus | § 5 |
| LAVAGE | Inclus, à confirmer | § 5 |
| ASSURANCE | Inclus | § 5 |
| LOCATION_VEHICULE | Inclus : loyer jamais remboursé en plus des IK | § 4, § 5.2 |
| PEAGE, STATIONNEMENT | En sus | § 5 |
| FOURNITURES_CLIENT (eau, mouchoirs) | En sus | § 5 |
| TELEPHONE_INTERNET | En sus, pour la part professionnelle | § 6 |
| REPAS | Refusé en IK (forfait repas) ; plafonné à 30 € en frais réels | § 8 |
| AUTRE | Revue humaine | — |

- **À arbitrer — HEBERGEMENT** n'apparaît dans aucun document. Logiquement en sus (frais hors véhicule), mais il faut une règle écrite.
- **À arbitrer — DEPRECIATION** n'est pas une catégorie de ticket : l'amortissement est une écriture d'inventaire. À retirer de l'app.
- **À arbitrer — Équipements de confort** (GPS, dashcam, support, tapis) et **frais administratifs** (carte VTC) sont en sus dans DEP-001 mais absents des deux listes. À ajouter, ou en AUTRE en attendant.
- **CONSOMMABLES et FOURNITURES_CLIENT** doivent rester séparées : en IK, les premières sont refusées, les secondes remboursées.
- **COMMISSION_PLATEFORME** est retirée de FACTURE_ACHAT pour éviter le double comptage.

### 8.5 Une catégorie par ligne ou par pièce

Une catégorie par pièce suffit pour démarrer, en gardant la structure par ligne du payload (même catégorie sur toutes les lignes). Un ticket qui mélange des catégories traitées différemment (par exemple consommables et fournitures client) part en revue. Carburant et lavage sur le même ticket ne posent pas de problème : même traitement dans les deux régimes.

### 8.6 TVA illisible

La pièce part en revue ; on ne met pas la TVA à 0 automatiquement, ce qui ferait perdre la TVA au chauffeur pour une erreur de lecture. Si la revue confirme qu'aucune TVA n'est imprimée, la TVA vaut 0 et la charge est imputée TTC (Annexe C § 3).

### 8.7 Doublons

- Fichier identique (même `sha256`) : bloqué.
- Triplet fournisseur | date | montant : gardé en repli, mais en **avertissement pour revue**, pas en blocage. Deux péages identiques le même jour (aller-retour) ou deux tickets de parking au même tarif sont des cas fréquents.
- Si l'heure est lisible, l'ajouter au triplet.

### 8.8 Moment de la comptabilisation (en attente de retour)

L'Annexe C comptabilise à la validation de la note (journal JA, R2), au crédit du 4211. Le remboursement ne fait que solder ce compte (R6).

## 9. Points ouverts et documents à mettre en cohérence

| Point | Document concerné | Action |
|---|---|---|
| Le 4211 n'apparaît pas dans le plan de comptes (seuls 4210 et 4280) | SIC v002 draft 8 | Ajouter le 4211{NOM} |
| L'indemnité de repas passe encore par le 4210 | Manuel des écritures de paie § 9 | Basculer sur le 4211 (arbitrage C1) |
| Dépense de nature circuit A payée par le chauffeur | Annexe C § 1.2 | Ajouter la règle : chauffeur payeur = circuit B |
| Compensation 4211 / 4210 / 4280 | Annexe C § 7.2, C11 | Avis de l'avocat en droit social |
| TVA sur les repas | Annexe C C3, DEP-001 § 8.4 | Confirmation de l'expert-comptable |
| Seuil de 150 € HT pour les tickets | DEP-001 § 3 | Confirmation de l'expert-comptable |
| Catégories HEBERGEMENT, DEPRECIATION, équipements, frais administratifs | Fiche FACTURE_ACHAT § 5.6 | À arbitrer |
| Retrait de COMMISSION_PLATEFORME des achats | Fiche FACTURE_ACHAT § 5.6 | Nouvelle version de la liste (`schema_version`) |
| Fait de dette chauffeur à la place de PAIEMENT_FOURNISSEUR | Fiche FACTURE_ACHAT § 9 | Définir le fait et son contenu |
| Moment de la comptabilisation | — | En attente du retour de l'équipe |

## Sources

- `01_Cadrage/STAIRLING_Principes_Guide_Traitement_Depenses_Professionnelles-v002_draft_4.docx` (DEP-001), § 2, 3, 4, 5, 6, 8
- `01_Cadrage/STAIRLING_SIC_Annexe_C_Frais_Professionnels-v001_draft_8.docx`, § 1.2, 2.2, 3, 4, 6, 7, 11
- `01_Cadrage/STAIRLING_SIC-v002_draft_8.docx`, § 9.4 à 9.6
- `02_Specifications/STAIRLING_Event_Payload_FACTURE_ACHAT_v001_draft_4.md`, § 5.6 et 9
- `02_Specifications/STAIRLING_Controle_Facture_v001_draft_2.md`
