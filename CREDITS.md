# Crédits

Toutes les images du jeu viennent de packs **CC0** (domaine public : aucun crédit obligatoire, usage commercial autorisé). On les crédite quand même, dans le pied de page du site.

Elles sont réduites et le décor est recoloré dans la palette vinyle 70s par `scripts/build-assets.py`. Les fichiers obtenus sont dans `assets/game/`. Les images d'origine utilisées (et les licences fournies dans les packs) sont gardées dans `assets/source/` : `python scripts/build-assets.py assets/source` régénère `assets/game/`.

| Usage | Pack | Auteur | Licence | Source |
| --- | --- | --- | --- | --- |
| Coureur (`runner.png`) | Toon Characters, « Male person » | Kenney | CC0 | https://kenney.nl/assets/toon-characters |
| Décor en parallaxe (`bg1.png` à `bg5.png`) | 2D Desert Platformer Pack | KingCreator11 | CC0 | https://opengameart.org/content/2d-desert-platformer-pack |
| Amplis et barrière (`amp*.png`, `barrier.png`, tuiles 032, 046 et 080, amplis recolorés) | Platformer Pack Industrial | Kenney | CC0 | https://kenney.nl/assets/platformer-pack-industrial |
| Caisses suspendues (`crate*.png`) | Boxes and crates SVG and PNGs | SpriteAttack | CC0 | https://opengameart.org/content/boxes-and-crates-svg-and-pngs |

Téléchargements directs utilisés :

- `https://kenney.nl/media/pages/assets/toon-characters/4e8a6e4e53-1774770819/kenney_toon-characters.zip`
- `https://opengameart.org/sites/default/files/desert%20platformer%20pack.zip` (serveur instable : `curl --retry 5 -C - -L`)
- `https://kenney.nl/media/pages/assets/platformer-pack-industrial/f61c3a5fc4-1677696008/kenney_platformer-pack-industrial.zip`
- `https://opengameart.org/sites/default/files/FreeArt_boxe%26crates1.zip`
