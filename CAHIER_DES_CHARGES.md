# Jour 15/30 — Fugue, courir, sauter, ne jamais s'arrêter

> Stack : **JavaScript**, **Canvas** · hébergement **Coolify**, sous-domaine `fugue.projectp.fr`.
> Durée visée : **2 h 45** pour le MVP, les bonus ensuite.

Ce document est notre contrat : on le suit étape par étape, et toute décision qui s'en écarte est d'abord notée ici. Il s'ajuste au début de la journée.

## 1. L'idée

Un jeu de course infinie en 2D : le personnage court tout seul, on saute et on glisse pour éviter les obstacles, la vitesse augmente. **Fugue** ajoute une touche musicale : les obstacles suivent le rythme d'une boucle générée en Web Audio.

## 2. MVP — ce qui doit fonctionner à la fin

1. Boucle de jeu à 60 images/s avec `requestAnimationFrame`, pas de temps fixe.
2. Saut (appui long = saut plus haut) et glissade, au clavier et au tactile.
3. Obstacles générés au hasard, vitesse croissante, collisions précises.
4. Score, record, écran de fin et rejouer en un appui.
5. Décor en parallaxe (3 plans).
6. En ligne sur Coolify, avec un README à jour et un aperçu de lien (Open Graph).

### Périmètre volontairement limité

- Graphismes dessinés en Canvas (formes), pas de sprites lourds.
- Un seul personnage.

## 3. Cahier des charges fonctionnel

### Équité

- Un obstacle impossible à franchir n'est jamais généré.
- La difficulté suit une courbe réglée (distance entre obstacles).

### Musique

- Le tempo accélère avec la vitesse ; les obstacles tombent sur les temps.

## 4. Cahier des charges technique

- Moteur minimal : `loop`, `input`, `world`, `render` séparés.
- Générateur pseudo-aléatoire, pour une « course du jour » identique pour tous.
- Pause automatique quand l'onglet est caché.
- Mise en ligne sur Coolify à chaque push sur la branche principale.

## 5. Critères de réussite

- [ ] 60 images/s sur un téléphone récent.
- [ ] Aucune collision injuste (boîtes de collision ajustées).
- [ ] Le record survit au rechargement.

## 6. Bonus facultatifs

- Course du jour partagée.
- Pièces et améliorations.
- Classement local.

## 7. Définition du « terminé »

Le MVP fonctionne, les critères de la section 5 sont cochés, le site est en ligne sur `fugue.projectp.fr`, le README a son lien et sa capture, et la carte du projet passe à « terminé » sur la vitrine.

## 8. À me demander avant de coder

À poser **avant d'écrire le code**, et attendre ma réponse :

1. **Le jeu quotidien.** Chaque projet a un jeu du jour pour faire revenir les visiteurs : le même tirage pour tout le monde (d'après la date), une tentative par jour, une série 🔥 et un résultat à partager. Me proposer deux ou trois idées adaptées au projet, puis attendre mon choix.
2. **Le look.** Me demander une référence visuelle sur laquelle se baser (un site, une marque, une ambiance, une capture). Le site doit être original et agréable à regarder, **pas « basique »** : une vraie identité (typographie, palette, mise en page, détails, animations), pas un gabarit générique. Si je n'ai pas d'idée, me proposer deux directions et attendre mon choix.

### Réponses (2026-10-27)

**Jeu du jour : deux défis quotidiens**, même graine pour tous d'après la date, une tentative chacun, série 🔥 commune (au moins un des deux joué dans la journée).

- 🎼 **Partition du jour** (défi principal) : un morceau fini de 32 mesures, 3 vies. Partage en « partition » d'emojis, une case par mesure : 🟩 propre, 🟨 touchée, ⬛ non atteinte. Score = mesures jouées, puis précision.
- 🏁 **Course du jour** (petit défi) : la course infinie sur la graine du jour, une vie. Partage de la distance et du tempo atteint (ex. « 1 240 m · 148 BPM »).
- Le mode libre (course infinie, graine aléatoire, rejouable à volonté) reste l'accueil du jeu et porte le record.

**Le look : « Vinyle 70s ».** Soleil couchant orange, brun, moutarde et crème ; rayures rétro, grain de papier, typographie arrondie et grasse. Parallaxe : soleil rayé et collines au loin, rayures au milieu, sol qui défile comme le sillon d'un disque.

### Ajustements (2026-10-27, après l'étape 4)

- **Graphismes du jeu** : on remplace les formes Canvas par des **assets libres de droit** (CC0 en priorité, CC-BY crédité ; jamais de licence non commerciale) pour un personnage, un décor et des obstacles plus réalistes. Cela remplace la ligne « Graphismes dessinés en Canvas (formes), pas de sprites lourds » du périmètre.
- **Une seule page** : une **page vitrine** soignée, style 70s, qui explique le jeu et le contient (section « Jouer »), au lieu d'un accueil et d'une page de jeu séparés.
- **Référence visuelle** donnée par Pierre : affiche groovy 70s (gros titre crème cerné, ombres empilées orange et jaune, vagues rayées ondulantes, bouton rond, badge circulaire). On en reprend la composition et les effets, **sur la palette brune validée** (espresso, orange, moutarde, crème).

### Nouvelles fonctions (2026-10-27, choix de Pierre)

**Contrôles**
- **Descente rapide** : en l'air, flèche bas (ou moitié droite) multiplie la gravité par 3. Chute max 2400 px/s ; l'appui long du saut est coupé ; atterrir touche enfoncée enchaîne sur une glissade.
- **Glissade limitée** : 0,9 s au plus, puis le coureur se relève ; il faut relâcher, puis attendre 0,3 s, pour reglisser. La vitesse n'est pas réduite (elle porte le tempo).

**Score et record**
- Notes ♪ à ramasser, posées sur les temps (lignes au sol, arcs de saut), tirées de la graine : +10 points chacune.
- **Score = mètres + points des notes.** Le record porte sur ce score combiné ; la distance reste affichée.

**Bonus** (un tous les 25 à 40 temps, tirés de la graine, actifs en mode libre et en Course du jour, pas dans la Partition du jour)

| Bonus | Effet |
| --- | --- |
| Disque d'or | Invincible 10 s |
| Semelles compensées | Saut 30 % plus haut, 10 s |
| Avance rapide | Saut dans le temps proportionnel à la distance : gain = 200 × (distance / 1000)^0,7 m (200 m à 1 000 m, environ 1 000 m à 10 000 m) ; obstacles sautés retirés, 1 s d'invincibilité |
| Ampli-fusée | Vol au-dessus des obstacles 6 s, en ramassant les notes ; 1 s de répit à l'arrivée |
| 33 tours | Le tempo redescend d'environ 20 BPM (ex. de 140 à 120 vers 2 000 m), puis remonte normalement |
| Micro | Aimant à notes, 10 s |
| Boule à facettes | Notes ×2, 15 s |
| Pochette | Bouclier qui absorbe un seul choc |

**Succès** : stats et succès en `localStorage`, bannière en jeu au déblocage, section « Succès » sur la page avec la progression. Quelques **succès secrets** (les clins d'œil : Pied de nez, Mélomane…) restent cachés jusqu'au déblocage ; les autres sont visibles avec leur progression.

### Niveaux et succès (2026-10-29, choix de Pierre)

**Niveaux de difficulté** (mode libre), choisis avant la course et retenus par le navigateur :

| Niveau | Tempo maximal | Coefficient de points |
| --- | --- | --- |
| Facile | 160 BPM | ×1 |
| Moyen (par défaut) | 180 BPM | ×1,5 |
| Difficile | 200 BPM | ×2 |
| Impossible | aucune limite | ×3 |

- **Score** : chaque mètre rapporte (BPM du moment / 100) × coefficient ; une note rapporte 10 × coefficient (×2 avec la boule à facettes). Cela remplace « Score = mètres + points des notes ». Un seul record, tous niveaux confondus.
- **Équité** : l'écart minimal entre obstacles grandit avec la vitesse prévue à l'endroit de l'obstacle (calculée d'après la distance, donc identique pour tous) ; le joueur parfait simulé est vérifié jusqu'à 250 BPM.
- Les **défis du jour** se jouent en Moyen, pour que la course soit la même pour tout le monde.

**Succès** : une centaine, rangés par familles (tempo de 120 à 250 BPM, distance, score, notes, bonus, gestes, niveaux, défis du jour), dont 15 secrets. Une **page à part** (`succes.html`) les liste avec des filtres (famille, débloqués / à faire) ; l'accueil en garde un résumé. Le jeu reste sur l'accueil.

## 9. Aperçu du lien (à faire sans me le redemander)

- Image Open Graph **1200 × 630** stylisée aux couleurs du projet : nom, accroche, technos et capture, générée avec `scripts/og/build-og.py` (ajouter le projet à la liste).
- Sur chaque page publique : `og:title`, `og:description`, `og:url`, `og:image` (adresse absolue), `og:image:width`, `og:image:height`, `og:image:alt` et `twitter:card` = `summary_large_image`.
- Vérifier en ligne que l'image répond en 200 et que les balises sont servies.

## 10. Indexation (à faire sans me le redemander)

- `robots.txt` : pages privées et routes techniques (API, JSON, admin) en `Disallow`, lien vers le sitemap.
- `sitemap.xml` : les pages publiques uniquement.
- Balise `canonical` sur chaque page publique ; `noindex` sur les pages privées.
- Données structurées JSON-LD sur l'accueil : `WebApplication`, avec `isPartOf` ProjectP (https://projectp.fr/).
- Lien « 30 jours, 30 projets » vers https://projectp.fr/ dans le pied de page.
- Site statique : ajouter le projet à `scripts/seo/apply-seo.py` et relancer le script.
- Vérifier en ligne, puis me rappeler de soumettre `https://fugue.projectp.fr/sitemap.xml` dans Google Search Console.

## 11. Vitrine 30days30projects (avec ma validation)

Une fois le projet en ligne, **me demander mon accord**, puis seulement :

- `projects.js` : l'entrée du jour 15 passe à `status: 'done'`, avec `name: 'Fugue'`, `url`, `repo`, `image` et `description`.
- `preview-days-images/day15_fugue.png` : la capture de l'accueil, en 1600 × 900.
- `README.md` : la ligne du jour 15 dans le tableau des 30 projets.
- Commit et push du dépôt `30days30projects`.
