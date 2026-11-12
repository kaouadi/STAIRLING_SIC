# La TVA sur les véhicules

<aside>
📌

**En bref.** Stairling Union ne restitue plus la TVA sur l'achat d'un véhicule, pour aucun chauffeur. Depuis le 12 août 2026, date du courrier de l'administration fiscale (proposition de rectification), aucune nouvelle restitution n'est ouverte et les restitutions déjà en cours sont arrêtées. Seule alternative pour un chauffeur : récupérer cette TVA via sa propre SASU, en dehors de Stairling Union.

</aside>

### **La règle**

La TVA sur l'achat du véhicule **ne peut pas être récupérée via Stairling Union** : Stairling Union n'est pas propriétaire du véhicule et la facture d'achat n'est pas établie à son nom. Les indemnités kilométriques (IK) du chauffeur sont là pour couvrir le coût d'utilisation de son véhicule.

**Seule alternative : passer par une SASU.**

- La SASU du chauffeur achète le véhicule, puis le **loue au chauffeur** via un contrat de location entre sa SASU et lui-même.
- C'est la **SASU qui récupère la TVA** sur l'achat, auprès de l'État et via sa propre comptabilité. Stairling Union ne reçoit pas la facture d'achat et n'intervient pas dans cette récupération.
- Le chauffeur nous transmet le **contrat de location** entre sa SASU et lui, ainsi que les **factures de location**, dont la dépense est prise en charge.
- **Pas d'IK en plus de la location :** la prise en charge de la dépense de location ne donne pas droit aux indemnités kilométriques en sus. Le barème des IK intègre déjà dans son calcul le coût d'utilisation du véhicule ; il ne peut donc pas se cumuler avec une location.

### **Quoi dire aux chauffeurs ?**

- **N'a pas de SASU :** « La TVA sur l'achat de ton véhicule ne peut pas être récupérée via Stairling Union : le véhicule est à ton nom, la facture aussi, et Stairling Union n'en est pas propriétaire. Tes indemnités kilométriques sont justement là pour couvrir le coût d'utilisation de ton véhicule. »
*Interne : ne pas proposer d'autres montages (achat du véhicule par la coopérative, compte courant, etc.), ils ne sont pas retenus.*
- **A (ou veut créer) une SASU :** « Tu peux récupérer cette TVA uniquement via ta SASU : c'est elle qui achète le véhicule et qui te le loue, avec un contrat de location entre ta SASU et toi. Ta SASU récupère alors la TVA dans sa propre comptabilité, Stairling Union n'intervient pas. De ton côté, envoie-nous le contrat et les factures de location : la dépense de location est prise en charge, mais elle remplace les indemnités kilométriques, qui couvrent déjà le coût d'utilisation du véhicule. Tu ne peux pas cumuler les deux. »
- **Est locataire de son véhicule :** « Envoie-nous tes factures de location. La TVA qu'elles contiennent est prise en compte dans ta rémunération au fur et à mesure que tu génères du CA. La prise en charge de la location ne se cumule pas avec les indemnités kilométriques, qui couvrent déjà le coût d'utilisation du véhicule. »
- **A déjà une TVA véhicule en cours de restitution :** « À la suite de nos échanges avec l'administration fiscale, Stairling Union n'est plus autorisée à déduire la TVA sur l'achat de véhicules qui ne lui appartiennent pas. La restitution de la TVA sur ton véhicule s'arrête donc à compter du 12 août 2026, y compris pour la part qui restait à te reverser. Si tu as une SASU, ou si tu envisages d'en créer une, on peut t'expliquer comment récupérer la TVA par ce biais à l'avenir. »
*Interne : [à valider par la direction] préciser si les montants déjà reversés au chauffeur sont ou non remis en cause.*

### **Côté équipes (interne)**

**Le principe : le mécanisme s'arrête pour tous les chauffeurs, nouveaux comme anciens.**

Aucune nouvelle restitution de TVA sur l'achat d'un véhicule n'est ouverte, et les restitutions déjà en cours s'arrêtent à compter du 12 août 2026.

| Situation du chauffeur | Ce qu'on fait |
| --- | --- |
| La TVA de son véhicule est **déjà en cours de restitution** | On arrête la restitution à compter du 12 août 2026 : la part restante n'est plus reversée. On prévient le chauffeur avec le script « A déjà une TVA véhicule en cours de restitution ». |
| Il nous envoie **une facture d'achat de véhicule** (nouveau chauffeur ou déjà inscrit) | On ne la traite pas.<br>**Sans SASU :** script [« N'a pas de SASU »](https://app.notion.com/p/La-TVA-sur-les-v-hicules-4002e6e7a3e4807a9383ff95802a6d56?pvs=21).<br>**Avec SASU :** la TVA reste récupérable, mais par sa SASU. Script [« A une SASU »](https://app.notion.com/p/La-TVA-sur-les-v-hicules-4002e6e7a3e4807a9383ff95802a6d56?pvs=21), et on lui demande le contrat et les factures de location. Pas d'IK en plus de la location. |
| **Nouveau chauffeur à l'inscription** | On ne mentionne plus la restitution de la TVA sur l'achat du véhicule, ni comme argument commercial ni comme démarche à faire. |

**Pourquoi ?** Lors de nos échanges avec le service des impôts, un certain nombre d'anomalies ont été portées à notre connaissance au sujet du droit à déduction de la TVA sur des dépenses régulièrement enregistrées et validées par Stairling Union. Stairling Union est en droit de récupérer la TVA sur un véhicule, à hauteur de son amortissement, aux seules conditions suivantes :

- être propriétaire du véhicule ;
- disposer d'une facture établie au nom de Stairling Union ;
- démontrer la réalité économique de l'opération ainsi que le droit de propriété de Stairling Union sur le véhicule.

Cela signifie que les factures d'achat de véhicule des chauffeurs ne peuvent pas bénéficier du droit à déduction de la TVA.

**Pourquoi on ne poursuit pas les restitutions en cours ?**

**Ce que l'administration a jugé irrégulier ne devient pas régulier parce qu'on l'a promis.**

L'administration fiscale a contesté le droit de Stairling Union à déduire la TVA sur des véhicules dont elle n'est pas propriétaire et dont les factures ne sont pas établies à son nom. Stairling Union a désormais connaissance de cette position.

La poursuite volontaire d'un mécanisme de déduction de TVA déjà remis en cause par l'administration fiscale est susceptible de caractériser un **manquement délibéré** au sens de l'article 1729 du Code général des impôts, exposant Stairling Union non seulement au rappel de la TVA indûment déduite, mais aussi à une **majoration de 40 %**. L'existence d'engagements commerciaux antérieurs ne saurait justifier la poursuite de déductions fiscales indues.

La suppression du mécanisme s'applique donc à **tous les chauffeurs**, nouveaux comme anciens, à compter du 12 août 2026.

**Attention au discours.** Toute communication indiquant à un chauffeur que sa restitution « continue » ou que « rien ne change » constituerait une trace écrite du maintien, en connaissance de cause, d'une déduction remise en cause par l'administration fiscale. Elle exposerait Stairling Union au risque de manquement délibéré décrit ci-dessus. Les équipes utilisent exclusivement le script « A déjà une TVA véhicule en cours de restitution » et ne prennent aucun engagement individuel de maintien. Toute demande de dérogation est remontée à la direction.
