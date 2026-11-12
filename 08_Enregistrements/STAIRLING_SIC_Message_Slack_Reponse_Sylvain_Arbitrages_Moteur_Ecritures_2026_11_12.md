Bonjour Sylvain,

Merci pour cette lecture croisée. Je suis content qu'on soit d'accord sur l'essentiel. Voici ma position sur chaque point.

*1. Date de l'écriture de régularisation*
Ce qui compte, c'est la date comptable de l'écriture (`EcritureDate` dans le FEC), pas la date à laquelle on la saisit. Une course du 15 janvier est enregistrée au 15 janvier, même si on la saisit le 15 mars.
Pour la TVA, c'est l'expert-comptable qui gère l'écart entre ce qui a été déclaré et la balance. Par exemple, si le compte 7061 de janvier affiche 200 000 € au 1er février puis 220 000 € au 28 février, il régularise les 20 000 € sur la déclaration CA3 suivante. Le moteur n'a donc pas à changer la date de l'écriture pour protéger un mois déjà déclaré. Il doit en revanche bien marquer ces écritures tardives pour qu'on puisse les isoler.
Autre point important : les régularisations ne concernent pas que le mois précédent. En calculant le CA mensuel de Stairling, et en préparant une attestation de CA certifiée demandée par les RH, j'ai trouvé des factures de juin arrivées le 2 novembre. La régularisation mensuelle doit donc reprendre *tous les mois antérieurs* concernés, pas seulement le mois M-1.

*2. Critère d'entrée dans la pièce du jour*
Le principe : tout ce qui arrive pendant le mois en cours relève du flux normal. Seul ce qui arrive après la clôture du mois de la course part en régularisation. Bolt, qui facture par lots dans le mois, n'est donc pas un cas de régularisation. Ces factures entrent dans le flux normal, au jour de la course.
raudrait
*3. Pourboires et bonus*
Je me suis mal exprimé avec « hors champ ». Je voulais dire que les pourboires ne sont pas soumis à la TVA et qu'ils ne figurent pas dans la déclaration de chiffre d'affaires. L'Annexe B reste la référence. C'est notre première version, et ce sont les exigences de la comptabilité qui servent de socle : elles font foi.

*4. Grain des pièces et fréquence des commissions*
Pour la commission, la vraie question est de savoir à quel niveau nous pouvons la connaître de façon fiable : à la pièce, à la journée, à la semaine ou au mois. Il faut aussi mesurer l'effet de chaque option sur la trésorerie du chauffeur.
J'en ai parlé au padre. Nous proposons :
• *en cours de mois*, une commission calculée sur un taux moyen et appliquée à chaque pièce ;
• *en fin de mois*, une régularisation sur la commission réelle.
C'est plus simple et plus sûr pour la comptabilité. Le chauffeur voit aussi une commission régulière, plutôt que des montants qui varient selon le moment où la plateforme envoie ses données.
Pour le grain des pièces (une écriture par chauffeur avec analytique, ou une pièce par plateforme avec un compte auxiliaire par chauffeur), je propose qu'on tranche ensemble pendant la réunion.

*5. Contrôle de rapprochement en entrée (N4)*
Pour ce contrôle, j'ai besoin d'autres sources d'information, c'est-à-dire de données opérationnelles. Elles doivent idéalement venir de l'extérieur du système comptable : un contrôle n'a de valeur que s'il est indépendant de ce qu'il vérifie. Si le service de réconciliation de Théo s'appuie sur ces données opérationnelles, et non sur les sorties du moteur, je suis d'accord pour que N4 l'utilise.

Je suis d'accord pour caler une heure cette semaine, dis-moi tes disponibilités. Je te confirmerai par écrit mon accord pour remettre 2026 à plat une fois les règles fixées.

Bonne journée,
Karim
