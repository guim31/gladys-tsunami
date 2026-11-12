# Alertes tsunami (NOAA)

Les messages tsunami officiels des deux centres d'alerte aux tsunamis de la
NOAA, pour la côte de votre maison, dans Gladys : le niveau en cours (message
d'information, avis, veille, alerte), le séisme qui en est la cause, et l'heure
d'arrivée estimée de la première vague quand le bulletin la donne.

> **Ce n'est pas un service d'alerte officiel.** Il lit des bulletins publics
> une fois par minute et peut être en retard, se tromper ou se taire (réseau,
> tsunami.gov, Gladys). Il ne remplace ni les sirènes, ni les alertes sur
> mobile (WEA, FR-Alert), ni la radio NOAA, ni les consignes des autorités
> locales. Si vous ressentez un fort séisme près de la côte, montez tout de
> suite en hauteur : n'attendez aucun message. Non affiliée à la NOAA.

## Ce que vous obtenez

- Un appareil, **Alerte tsunami**, pour la région suivie :
  - **Niveau d'alerte tsunami** (niveau de risque) : 0 pas de menace, 1 avis,
    2 veille ou message de menace international, 3 alerte ;
  - **Message en cours** : le type du dernier message, ou « Aucun message en
    cours » ;
  - **Magnitude du séisme** et **Séisme** (lieu et heure d'origine) ;
  - **Arrivée estimée** : la première vague au point de prévision le plus
    proche de votre maison (300 km au plus), quand le bulletin donne des
    heures d'arrivée.
- Un déclencheur de scène pour chaque nouveau bulletin de votre région, une
  action de scène qui lit le message en cours en une phrase, et un widget de
  tableau de bord.

## Prérequis

- Gladys Assistant 5.1 ou plus récent.
- Un accès Internet de Gladys vers `www.tsunami.gov` (HTTPS). Ni compte, ni
  clé.
- La position de votre maison renseignée dans Gladys, ou des coordonnées dans
  la configuration, ou une région choisie à la main.

## Configuration

1. Installez l'intégration (Intégrations → Installer depuis GitHub,
   `https://github.com/guim31/gladys-tsunami`).
2. Ouvrez sa configuration, vérifiez les réglages ci-dessous et enregistrez.
3. Dans l'onglet **Découverte**, créez l'appareil **Alerte tsunami**.

### Réglages

- **Région suivie** : _Automatique_ la déduit de votre maison. Choisissez-la à
  la main si votre côte est proche de la limite entre deux régions, ou en
  dehors.
  - Alaska, Colombie-Britannique et côte ouest des États-Unis (NTWC) ;
  - côtes est et du golfe des États-Unis, est du Canada (NTWC) ;
  - Hawaï ; Guam et îles Mariannes du Nord ; Samoa américaines ; Porto Rico
    et îles Vierges (PTWC) ;
  - Caraïbes et Pacifique, messages internationaux (PTWC) : les messages de
    menace que le PTWC rédige pour les autorités nationales de chaque pays du
    bassin (Antilles françaises, Polynésie française, Nouvelle-Calédonie,
    Japon, Chili…).
- **Latitude / longitude de la maison** : laissez les deux vides pour utiliser
  votre maison dans Gladys. La virgule décimale est acceptée.
- **Fréquence de mise à jour** : 1, 2 ou 5 minutes.
- **Langue des textes** : noms de l'appareil et des fonctionnalités (à leur
  création) et textes envoyés aux scènes.

## Niveaux et messages

| Message (NOAA)                    | Niveau | Signification                                     |
| --------------------------------- | ------ | ------------------------------------------------- |
| Aucun message, information        | 0      | Pas de menace pour votre région, ou rien en cours |
| Avis (Advisory)                   | 1      | Courants et vagues forts : sortez de l'eau        |
| Veille (Watch)                    | 2      | Un tsunami est possible : soyez prêt à agir       |
| Message de menace (international) | 2      | Vagues dangereuses prévues sur certaines côtes    |
| Alerte (Warning)                  | 3      | Tsunami dangereux possible ou attendu : évacuez   |
| Annulation ou message final       | 0      | L'alerte est terminée                             |

Un avis, une veille, une alerte ou un message de menace reste en cours jusqu'au
bulletin suivant de la région (mise à jour, annulation), ou 12 heures sans
aucun bulletin. Un message d'information ou une annulation s'affiche jusqu'à
son expiration (une heure), puis « Aucun message en cours ».

## Widget du tableau de bord

**Tsunami (NOAA)** : la région, le message en cours coloré selon le niveau (vert
rien, bleu information, orange avis, veille ou menace, rouge alerte), le séisme
et l'arrivée estimée, un bouton vers le bulletin, et l'heure de la dernière
lecture. Réglages : afficher le séisme, afficher le lien.

## Déclencheur de scène

**Tsunami : nouveau message de la NOAA**, filtré par type de message
(information, avis, veille, alerte, menace, annulation) et par région.
Variables : type et région en toutes lettres, niveau, magnitude, lieu du
séisme, arrivée estimée, le message en une phrase, et le lien vers le bulletin.

Les bulletins déjà publiés à l'installation de l'intégration, ou quand la
région change, ne déclenchent rien. Pour « le niveau monte » ou « l'alerte est
terminée », vous pouvez aussi utiliser la fonctionnalité **Niveau d'alerte
tsunami** dans une condition d'appareil.

## Action de scène

**Tsunami : lire le message en cours** : renvoie `text` (une phrase, à envoyer
par message ou à lire à voix haute), `level` (0 à 3) et `kind` (`none`,
`information`, `advisory`, `watch`, `warning`, `threat`, `cancellation`).

## Exemples de scènes

- Déclencheur _Tsunami : nouveau message de la NOAA_, types _Veille_ et
  _Alerte_ : envoyer la variable `summary` par Telegram et allumer toutes les
  lumières.
- Déclencheur _Tsunami : nouveau message de la NOAA_, type _Annulation_ :
  envoyer « Fin de l'alerte tsunami ».
- Chaque jour à 8 h, si le niveau vaut 1 ou plus : lire à voix haute le texte
  de l'action de scène.

## Sources de données, conditions et quotas

- `https://www.tsunami.gov/events/js/previous.js` (les 40 derniers bulletins
  des deux centres, un par produit) et les flux Atom `PAAQAtom.xml` (NTWC) et
  `PHEBAtom.xml` (PTWC), lus avec `If-Modified-Since` : le site répond
  `304 Not Modified` tant que rien n'est publié.
- Pour chaque nouveau bulletin de votre région, son document CAP et son
  bulletin texte (deux petits fichiers).
- Les données de la NOAA sont dans le domaine public ; aucun quota n'est
  publié. L'intégration envoie un User-Agent qui la nomme, comme le demande la
  NOAA.

## Dépannage

- **« Aucune région »** : renseignez la position de votre maison dans Gladys
  (Paramètres → Maisons), ou choisissez la région à la main.
- **« loin des côtes couvertes par la NOAA »** : votre maison est hors de
  toutes les régions ; choisissez la plus proche à la main si vous voulez ses
  messages.
- **L'appareil reste à « Aucun message en cours »** : c'est l'état normal ;
  l'action **Afficher le message en cours** vérifie la dernière lecture.
- Plus de détails avec `LOG_LEVEL=debug` dans les journaux de l'intégration.

## Limites

- La région est une côte entière, pas votre zone exacte : une alerte pour
  l'Alaska s'affiche aussi pour une maison en Californie. Lisez le bulletin
  avant d'agir.
- Les heures d'arrivée ne viennent que des bulletins qui listent des points de
  prévision avec coordonnées (les messages de menace internationaux). Les
  alertes américaines donnent leurs heures en toutes lettres : elles ne sont
  pas lues.
- Le texte des bulletins reste en anglais (les mots de la NOAA).
- Testée contre les vrais bulletins de tsunami.gov (séisme du Panama du
  9 octobre 2026, messages de novembre 2026). Aucune vraie alerte américaine
  n'a été émise pendant son écriture : les cas d'alerte, de veille, d'avis et
  d'annulation sont dérivés d'un vrai message. Vos retours sont les bienvenus.
