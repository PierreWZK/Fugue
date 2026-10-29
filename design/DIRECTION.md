# Fugue · Direction artistique

> Synthèse des skills Taste (tirage `page-is-the-object`, graine 1925696098), UI/UX Pro Max (règles UX, style « Vintage Analog »), Emil Kowalski (mouvement) et Impeccable (thèse de mouvement). Choix de Pierre : look **Vinyle 70s**.

## 1. L'idée

**Fugue** a deux sens : la forme musicale de Bach, et « faire une fugue », s'enfuir. Le coureur s'enfuit sur le rythme d'une boucle funk.

> Sur ce site, **le 33 tours d'une fugue** devient **l'objet de la page** : chaque page est une pochette rangée dans un bac à disques, le jeu est la face A, les règles sont au verso.

- **Accueil = bac à disques.** Cinq pochettes empilées, chacune avec son intercalaire à onglet (forme trapèze, `clip-path`) : *Mode libre*, *Partition du jour*, *Course du jour*, *Comment jouer*, *Records*. La pochette de devant est ouverte et porte le bouton « Lancer la face A ».
- **Jeu = la pochette posée sur la platine.** Le canvas est au format 16:9 dans la pochette, le HUD est imprimé comme une étiquette de disque (rond central : tempo, mesure, score).
- **Le « truc vivant »** (exigé par Taste) : un **aperçu jouable** dans la pochette de devant. Le coureur court déjà en sourdine sur la graine du jour ; un appui le fait sauter.

## 2. Palette (proportions du tirage, couleurs du vinyle)

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Fond (`--bg`) | `#24150e` espresso | Le bac, le fond du jeu la nuit |
| Surface (`--surface`) | `#3b2417` noyer | Pochettes du fond, panneaux |
| Papier (`--paper`) | `#f1e2c4` | Pochette avant, fiches, texte sur fond sombre |
| Encre (`--ink`) | `#24150e` | Texte sur papier, orange et moutarde |
| Accent (`--accent`) | `#e9a93a` moutarde | **Une seule action par écran** (le bouton principal) |
| Champ 1 | `#e2582b` orange | Rayures, soleil, pochette « Partition du jour » |
| Champ 2 | `#a8431f` rouille | Rayures, obstacles |
| Champ 3 | `#6f6a24` olive | Rayure du fond, collines |

Contrastes vérifiés :
- **Passent :**
  - papier sur espresso : 13.8 ;
  - espresso sur moutarde : 8.6 ;
  - espresso sur orange : 4.8 ;
  - papier sur rouille : 4.7.
- **À éviter :**
  - texte papier sur orange : 2.9 ;
  - texte papier sur olive (4.4), sauf en grand.

Pas de fond crème avec accent terracotta : le fond est brun et le papier n'apparaît que sur les objets.

## 3. Typographie

Le tirage proposait Barlow Condensed, puis Literata. Les deux ont été écartées : le brief demande une typo ronde et grasse.

- **Titres : Fraunces**, axe `SOFT` 100, `WONK` 1, graisse 800 à 900. C'est le gras mou des pochettes des années 70.
- **Texte et HUD : Rubik** 400/500, chiffres tabulaires (`font-variant-numeric: tabular-nums`) pour le score et le BPM.
- Cinq tailles au plus. Le titre est très grand sur la pochette (la référence est l'affiche), les détails sont petits et exacts, en casse normale. Pas de capitales espacées.

## 4. Matière

- **Rayures 70s** : bandes plates orange, rouille et moutarde, sans dégradé. Elles servent de dos de pochette et de plan intermédiaire de la parallaxe.
- **Grain** : filtre SVG `feTurbulence` en surcouche à 6 % d'opacité, statique, avec `pointer-events: none`.
- **Bords découpés** : onglets en trapèze, coin de pochette usé, ticket de partage au bord dentelé. Des formes pleines (`clip-path`), jamais de contour fin.
- **Aucune ombre au repos, aucun dégradé.** L'ombre est réservée à ce qui flotte vraiment (la fiche de fin de partie).

## 5. Pages et sections (blueprints du tirage, adaptés)

1. **Accueil, héros « Tabbed folder stack »** : nom FUGUE en Fraunces, très grand et centré, avec une phrase d'accroche (« Une course infinie qui suit le rythme. Sauter, glisser, ne jamais s'arrêter. »). En dessous, les 5 pochettes empilées avec leurs onglets.
2. **Showcase, « Output slips »** : des fiches de résultat posées en bas d'écran. Ce sont de vraies sorties du jeu : la partition du jour en cases colorées, « 1 240 m · 148 BPM », etc. Elles sont posées sur la photo du disquaire de 1976.
3. **Comment jouer, « Itinerary on a slip »** : la *tracklist* au dos de la pochette, découpée en zigzag.
   - Lignes : Face A, Intro 96 BPM, Mesures 1-8 sauts simples, 9-16 glissades, etc., avec des pointillés de liaison.
   - Dernière ligne inversée : « 32 mesures · environ 2 min 30 ».
4. **Partitions des jours passés, « Cards that fold into spines »** : les cartes se replient en **tranches de disques** rangées sur l'étagère. Sur téléphone, empilement simple, sans épinglage.
5. **Pied de page, « The back of the card »** : le verso de la pochette avec ses crédits. Bord festonné, timbre (photo de la platine), crédits des images et lien « 30 jours, 30 projets ».

## 6. Images réelles (Wikimedia Commons, licences libres)

Taste en impose au moins 4. Les candidates :

- Bach, *Die Kunst der Fuga*, page de titre autographe (domaine public) : le clin d'œil au nom.
- Bach, dernière page inachevée de *L'Art de la fugue*, 1749 (domaine public).
- *1976 - Speedys Record Shop*, Allentown (domaine public) : le disquaire, fond du showcase.
- *1971 - Skateway Roller Rink* (domaine public) : l'ambiance roller disco.
- Platine Pioneer PL-200 de 1979 (CC BY-SA 2.0, crédit obligatoire) : le timbre du verso.

Les images sont téléchargées dans `assets/` et créditées dans le pied de page. Aucune n'est présentée comme une capture du jeu.

## 7. Le jeu (canvas)

- **Parallaxe en 3 plans :**
  - au loin, soleil rayé et collines olive ;
  - au milieu, rayures 70s qui défilent ;
  - devant, le sol en sillon de disque (lignes concentriques qui filent).
- **Coureur** en formes simples : silhouette ronde, pattes d'éph', cheveux afro qui rebondissent sur le temps.
- **Obstacles** : notes de musique et piles de disques à sauter, barres de portée à glisser dessous.
- Les obstacles tombent sur les temps. Un petit « tic » visuel (le soleil pulse de 2 %) marque chaque temps.

## 8. Mouvement (Emil + Impeccable)

**Thèse.** Le moment fort est **la pochette qui sort du bac**. Au clic sur une pochette, elle monte et glisse hors de la pile (transition de vue, `translateY` puis `scale`, 450 ms, `cubic-bezier(0.16, 1, 0.3, 1)`), puis le disque sort de la pochette et le jeu commence. C'est le seul geste « signé » du site.

**Rétroaction** :
- boutons et pochettes à `scale(0.97)` sur `:active`, 140 ms en ease-out ;
- survol seulement sous `@media (hover: hover) and (pointer: fine)` : la pochette se soulève de 8 px.

**Entrées** : sur l'accueil, les onglets arrivent en cascade, 60 ms d'écart et 24 px de montée. Le contenu reste visible si le script ne charge pas.

**Le jeu** (ressenti, pas de transitions CSS) :
- **saut** : impulsion immédiate, gravité plus forte en descente, ce qui donne un saut vif ;
- **saut long** : la gravité reste réduite tant que l'appui est maintenu, jusqu'à 220 ms ;
- **tolérances** : *coyote time* de 80 ms et mémoire de l'appui (*input buffer*) de 100 ms ;
- **glissade** : écrasement du coureur (`scaleY` 0,55) en 60 ms ;
- **collision** : 120 ms d'arrêt sur image, secousse de 6 px amortie sur 200 ms, puis l'aiguille qui saute (« scratch » en Web Audio).

**Fin de partie** : la fiche de résultat entre en 300 ms (opacité + `translateY` de 16 px) et sort en 150 ms. Le bouton « Rejouer » a le focus d'office, Espace ou Entrée relance.

**Les actions au clavier ne sont jamais animées** : sauter, glisser et rejouer sont instantanés.

**`prefers-reduced-motion`** : plus de secousse, de pulsation du soleil ni de cascade. La parallaxe passe à un seul plan qui défile, et les fondus restent.

## 9. Règles UX (UI/UX Pro Max)

- **Cibles et boutons :**
  - zones tactiles du jeu : moitié gauche de l'écran = sauter (appui long = plus haut), moitié droite = glisser ;
  - boutons d'au moins 44 px, avec 8 px d'écart minimum.
- **Clavier :**
  - Espace ou ↑ pour sauter, ↓ pour glisser, P pour la pause, M pour couper le son ;
  - focus visible, en anneau moutarde de 3 px.
- **Pause** automatique quand l'onglet est caché (`visibilitychange`). L'audio est coupé avec.
- **Son** : jamais lancé sans geste de l'utilisateur. Le bouton son est toujours visible, et le choix est mémorisé.
- **Emojis** : uniquement dans le texte à partager, jamais comme icônes de l'interface (icônes SVG maison).
- Contraste de 4.5:1 minimum partout (voir section 2).

## 10. Écarts aux règles des skills, assumés

- **Palette** : Taste avait tiré « Frost and slate ». Elle est remplacée par les couleurs du vinyle (brief de Pierre), en gardant les proportions : un fond, un papier, une encre, un accent.
- **Typographie** : elle a été tirée deux fois puis remplacée par Fraunces et Rubik (brief : ronde et grasse).
- **Style « Pixel Art »** : UI/UX Pro Max l'avait proposé, il est écarté car hors du brief.
