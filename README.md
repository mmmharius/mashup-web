# Éditeur de template d'images

Un éditeur en Vue.js pour composer un visuel (image principale, calques d'images et de texte), l'exporter
en PNG et l'enregistrer comme template JSON. Un module Node rejoue ce template avec sharp pour fabriquer
de nouvelles images, et chaque action clé est suivie pour mesurer l'usage.

Démo : https://mmmharius.github.io/mashup-web/ (ajouter `?utm_source=tiktok` à l'adresse pour voir la
source d'acquisition dans le panneau « Événements suivis »).

## Lancer le projet

Node 22.

```
npm install
npm run dev      # l'éditeur, en développement
npm test         # tests de l'éditeur
npm run build    # vérification des types et version de production dans dist/

cd server
npm install
npm test         # tests du générateur sharp
node cli.js template.json sortie.png --image photo.jpg --text "Nouveau texte"
```

## Ce que fait l'éditeur

- **Format** : automatique (taille de l'image principale) ou forcé en 9:16, 4:3, 16:9, 1:1. Le plan de
  travail montre le visuel à l'échelle, la taille d'export est affichée, ce qui dépasse apparaît voilé.
- **Image principale** : import, déplacement, zoom, rotation (souris, poignées, curseurs ou valeur tapée).
- **Calques d'images et de texte** : placement libre, ordre, renommage, suppression. Le texte se modifie
  sur le canvas par un double clic : police, taille, couleur, couleur de fond.
- **Confort** : annuler / rétablir (Ctrl+Z), flèches du clavier, zoom de la vue à la molette, déplacement
  de la vue au clic droit, couleur du fond.
- **Export** en PNG à la taille réelle du format, et partage natif quand le navigateur le permet.
- **Template** : « Enregistrer » écrit un fichier JSON, « Ouvrir » le recharge à l'identique.

## Choix techniques

- **Vue 2.7** avec `<script setup>`, TypeScript strict et Vite. Le projet a démarré en Vue 3 et a été
  migré dès votre réponse sur la stack (commit `REFACTOR: migrate to vue 2.7`).
- **Pinia, un seul store** (`src/stores/editor.ts`) : format, fond, image principale, calques, sélection,
  historique. Les composants lisent le store et appellent ses actions, ils ne gardent aucun état métier.
- **Fabric.js pour le canvas** : sélection, poignées, rotation et saisie de texte sont fournies.
- **Le store commande, Fabric affiche** : `src/editor/scene.ts` est le seul fichier qui parle à Fabric.
  Il recopie l'état du store dans le canvas, et chaque geste fait sur le canvas repasse par une action
  du store. L'annuler / rétablir, le template JSON et le tracking ne regardent donc que le store.
- **Tout est en pixels d'export** : seule l'échelle d'affichage change à l'écran. Un visuel 9:16 fait
  1080 x 1920 dans l'éditeur, dans le template et sur le serveur.
- **Polices embarquées** (`server/fonts/`, licence SIL OFL) : l'éditeur et le serveur dessinent avec les
  mêmes fichiers, sans appel à un service tiers.

## Le template JSON

Le fichier décrit le visuel, du bas vers le haut de la pile (`src/editor/template.ts`) :

```json
{
  "version": 1,
  "format": "9:16",
  "width": 1080,
  "height": 1920,
  "background": "#ffffff",
  "elements": [
    { "type": "image", "role": "main", "name": "photo.jpg", "x": 540, "y": 960, "rotation": 0,
      "scale": 2.13, "width": 1600, "height": 900, "source": "data:image/jpeg;base64,..." },
    { "type": "text", "name": "title", "x": 540, "y": 1500, "rotation": 0, "scale": 1,
      "text": "Votre texte", "size": 72, "font": "Inter", "color": "#ffffff", "background": "#1c2030" }
  ]
}
```

`x` et `y` sont le centre de l'élément. Le fichier vient de l'extérieur : il est vérifié champ par champ
à l'ouverture, côté éditeur comme côté serveur, et refusé avec la raison s'il est incohérent.

## Le serveur (Node + sharp)

`server/generate.js` expose une fonction qui renvoie un PNG, sans navigateur :

```js
import { generate } from './generate.js'

const png = await generate(template, { image: photoBytes, text: 'Soldes d\'hiver' })
```

- `image` remplace l'image principale : la nouvelle image remplit le même emplacement, recadrée au
  centre. Si le template n'a pas d'image principale, elle devient le fond du visuel.
- `text` remplace le premier texte. Si le template n'a pas de texte, il est ajouté au centre.
- `images` et `texts` remplacent des calques désignés par leur nom (d'où le renommage dans l'éditeur).
- Sans contenu, le serveur redonne le visuel de l'éditeur : moins de 1 % de pixels d'écart, sur le
  lissage du texte.

`cli.js` offre la même chose en ligne de commande (`--image logo=logo.png`, `--text title="Promo"`).

## Tracking

Une couche dédiée dans `src/tracking/` :

- `events.ts` : le catalogue typé. Un nom d'événement ou une propriété oubliée ne compile pas.
- `index.ts` : `track()`, seule porte d'entrée. Chaque événement part dans `window.dataLayer` avec la
  source d'acquisition et un identifiant de session : Google Tag Manager ou un autre outil s'y branche
  sans toucher au code.
- `acquisition.ts` : lit les paramètres UTM et le site d'origine à l'arrivée, et les garde pour la session.
- `pinia.ts` : un plugin Pinia écoute les actions du store et envoie l'événement une fois l'action
  réussie. Les composants n'appellent jamais le suivi.

| Événement | Quand |
|---|---|
| `session_start` | arrivée sur la page |
| `format_selected` | choix d'un format |
| `main_image_imported` | import ou remplacement de l'image principale |
| `image_layer_added`, `text_added` | ajout d'un calque |
| `text_edited` | fin d'une modification de texte (regroupée, pas un événement par touche) |
| `layer_deleted` | suppression d'un calque |
| `history_used` | annuler ou rétablir |
| `template_saved`, `template_opened` | enregistrement ou ouverture d'un template |
| `export_succeeded`, `export_failed` | téléchargement ou partage |

### Ce que je suivrais en priorité

1. **Taux d'export par source d'acquisition** : sessions avec `export_succeeded` / `session_start`,
   découpé par `utm_source`. C'est la conversion : elle dit quel canal amène des gens qui vont au bout.
2. **Activation** : part des sessions qui importent une image principale, puis qui ajoutent au moins un
   calque. L'entonnoir `session_start` > `main_image_imported` > `text_added` ou `image_layer_added` >
   `export_succeeded` montre à quelle étape on perd les visiteurs.
3. **Temps jusqu'au premier export** (`seconds_since_arrival`, en médiane) : la mesure la plus directe
   de la simplicité de l'outil.
4. **Réutilisation** : `template_saved` puis `template_opened`. Enregistrer un template, c'est prévoir de
   revenir : le meilleur signal d'adoption durable.
5. **Friction** : taux d'`export_failed`, et nombre d'`history_used` par session (beaucoup d'annulations
   signalent une interface qui piège).

## Ce que j'ai simplifié par manque de temps

- **Téléphone** : l'interface est pensée pour l'ordinateur. Sur petit écran les panneaux s'empilent, mais
  la vue n'a ni zoom ni déplacement au doigt.
- **Images embarquées dans le template** (base64) : le fichier est autonome mais lourd. En production,
  les images seraient stockées à part et le template ne garderait que leur adresse.
- **Pas de sauvegarde automatique ni de compte** : le travail vit dans l'onglet, le template est un fichier.
- **Texte** : un style par calque (pas de gras, d'italique ni d'alignement), six polices, servies en
  fichiers complets plutôt qu'en sous-ensembles allégés.
- **Tests** : la logique (formats, store, template, tracking) et le serveur sont testés. Le canvas Fabric
  est vérifié à la main dans le navigateur, sans tests de bout en bout.
- **Tracking** : les événements s'arrêtent à `dataLayer`. Aucun outil d'analyse n'est branché, et il
  faudra un recueil du consentement avant d'en brancher un.
- **Serveur** : une fonction et une ligne de commande, pas d'API HTTP.
