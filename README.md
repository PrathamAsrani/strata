# Strata — v0.5

[![Release](https://img.shields.io/github/v/release/SolidGeeks/strata)](https://github.com/SolidGeeks/strata/releases) [![Licence AGPL-3.0](https://raw.githubusercontent.com/SolidGeeks/.github/main/assets/badges/license-agpl.svg)](LICENSE) [![Signed releases](https://raw.githubusercontent.com/SolidGeeks/.github/main/assets/badges/signed-releases.svg)](#2-démarrage-rapide-avec-docker) [![Tests](https://github.com/SolidGeeks/strata/actions/workflows/ci.yml/badge.svg)](https://github.com/SolidGeeks/strata/actions/workflows/ci.yml)

**English:** Strata is a self-hosted 3D map of your information systems — zones, VLANs, assets, flows, exposure, vulnerabilities and incident contacts. Website and documentation: **https://solidgeeks.github.io/strata/**

*Anciennement IS Map 3D. La suite de ce README est en français.*

**Site et documentation** : le dossier `docs/` contient le site GitHub Pages (en anglais), avec le film de présentation piloté par le défilement. Activation : *Settings › Pages › Build and deployment › Deploy from a branch*, branche `main`, dossier `/docs`. Le code source du film est dans `media/reel/`.

Cartographie 3D de systèmes d'information : SI, zones, VLAN, équipements low poly, flux entrants et sortants, exposition des ports (Internet, inter-VLAN, intra-VLAN), vulnérabilités et contacts d'incident.

## Mode nuit (v0.5.2)

*Display › Theme* : **Auto** suit le réglage clair/sombre du système (comportement par défaut), **Day** et **Night** l'imposent. Raccourci clavier : **N** bascule entre jour et nuit. Le choix est mémorisé dans le navigateur. La 3D, le schéma 2D et les panneaux suivent le thème ; les plans d'architecture exportés (PNG/SVG) restent sur fond clair pour la documentation.

## Nouveau nom (v0.5.1)

IS Map 3D s'appelle désormais **Strata**, pour les couches de plateaux qui empilent zones et VLAN. Rien ne change dans les données : les exports et sauvegardes IS Map s'importent tels quels, les scripts qui envoient encore `X-Requested-With: is-map` continuent de fonctionner, et la carte enregistrée dans le navigateur est retrouvée.

**Mettre à jour une installation IS Map existante** :

- **Docker** : le service s'appelle maintenant `strata` et le volume de données `strata-data`. Pour garder vos données, ajoutez dans `.env` le nom de l'ancien volume (`docker volume ls`, en général `is-map_ismap-data`) : `DATA_VOLUME=is-map_ismap-data`. Puis `docker compose down --remove-orphans && docker compose up -d --build`. Les commandes deviennent `docker compose logs -f strata`, `docker compose exec strata …`.
- **systemd** : le nouveau fichier est `deploy/strata.service` (dossiers `/opt/strata`, `/var/lib/strata`, `/etc/strata.env`). Vous pouvez aussi garder votre ancienne unité `is-map.service` et ses chemins : seuls les noms changent.

## Nouveautés de la v0.5 : connecteurs

Quatre connecteurs, dans *Collaboration › Connectors* (version auto-hébergée uniquement). **Aucun n'écrit directement sur la carte** : chaque synchronisation prépare **une proposition par IS**, que un `approver` relit sur la carte (surlignage vert / orange / rouge) puis publie ou refuse, comme une proposition faite à la main. Tant qu'elle n'est pas traitée, la synchronisation suivante met à jour la même proposition au lieu d'en empiler une nouvelle. Si la carte correspond déjà, aucune proposition n'est créée.

| Connecteur | Ce qu'il lit | Ce qu'il propose |
|---|---|---|
| **Cyberwatch** | serveurs et leurs CVE (API v3 : `/api/v3/vulnerabilities/servers`, puis le détail de chaque serveur) | les vulnérabilités des équipements, reconnus par nom d'hôte puis par IP. Sévérité minimale et nombre maximal par équipement réglables ; les CVE ignorées dans Cyberwatch sont écartées par défaut. Cyberwatch « possède » les entrées `CVE-…` des équipements qu'il scanne ; les constats saisis à la main (`Config.`…) sont conservés. |
| **GLPI** | ordinateurs, équipements réseau, imprimantes, téléphones (API REST `apirest.php`) avec leur IP (ports réseau), système, logiciels installés, technicien et groupe responsables, lieu | le **lieu** désigne l'IS (règles `texte du lieu = id de l'IS`, ou à défaut l'IS dont le nom apparaît dans le lieu). Les équipements existants reçoivent système, applications et contacts (ceux saisis à la main restent ; une application saisie à la main garde ses ports et prend la version de l'inventaire). Les absents sont créés sur le VLAN dont la plage contient leur IP, sinon sur un plateau *To sort (from GLPI)* dans une zone *Imported*. |
| **phpIPAM** | sections, sous-réseaux, VLAN, adresses (API `/api/{app}/…`) | les VLAN de chaque IS (numéro, nom, plage) : un sous-réseau déjà présent comme VLAN d'un IS va dans cet IS, sinon règles `section ou lieu = id de l'IS`. Les nouveaux VLAN arrivent dans la zone *Imported*. Les adresses complètent l'IP des équipements, déplacent un équipement vers le VLAN de son sous-réseau, et signalent les IP qui diffèrent (sans les changer). Création d'équipements depuis les adresses nommées : désactivée par défaut. |
| **Palo Alto** | configuration PAN-OS d'un pare-feu ou de Panorama : **fichier XML** importé dans l'app (*Import a configuration file*, ouvert aux `contributor`) ou **API XML** (`type=export&category=configuration`, clé d'un rôle admin en lecture seule) | les règles *allow* actives deviennent des flux de l'IS choisi : objets d'adresse et groupes → équipements par IP (une plage est développée en ses équipements jusqu'à un seuil, 12 par défaut), adresses publiques et FQDN → services Internet existants (même hôte) ou nouveaux, services et groupes de services → ports (`application-default` → ports usuels des App-ID courants), et le pare-feu choisi comme équipement traversé. Une source `any` dans une zone `untrust`/`internet`/`outside`/`wan` vaut « Internet ». Les flux entrants depuis Internet sur un port d'administration ou de base de données sont marqués à risque. Les flux d'une règle disparue sont retirés (réglable) ; les flux dessinés à la main ne sont jamais touchés. Ce qui ne peut pas être dessiné (règles `any`→`any` internes, groupes dynamiques, négations, adresses sans équipement) est listé dans la proposition. |

Réglages : un `admin` renseigne chaque connecteur (*Settings*) ; *Test the connection* vérifie l'accès ; *Sync now* (approver) lance une synchronisation en arrière-plan ; *Sync automatically every … hours* la planifie. Les identifiants sont stockés côté serveur dans `data/connectors.json` (droits 600), **ne sont jamais renvoyés au navigateur** et ne sont pas dans les sauvegardes JSON de la carte (mais bien dans l'archive de `backup.sh`, protégez-la). Certificats internes : collez le certificat de votre AC dans *More settings*, ou cochez *Accept any TLS certificate* sur un réseau de confiance.

Les équipements gardent le lien vers leur fiche d'origine dans `ext` (par ex. `{"glpi":"Computer/12","cyberwatch":101}`), ce qui fiabilise les synchronisations suivantes, même après un renommage.

Règle des quatre yeux : la proposition issue d'un **fichier** Palo Alto compte comme celle de la personne qui l'a importé (elle ne peut pas la valider elle-même). Une synchronisation en direct (données lues dans vos outils) peut être validée par celui qui l'a lancée.

### Préparer les comptes dans vos outils

- **Cyberwatch** : *Profil › Clés d'API › Ajouter*, clé en lecture seule. Authentification Basic (clé d'accès : clé secrète) ; l'ancienne signature *API Auth* HMAC-SHA256 reste disponible dans les réglages pour les anciennes instances. Le chemin de la liste des serveurs se change dans *More settings* si votre version diffère (vérifiez dans le Swagger de votre instance, bouton `</>`).
- **GLPI** : *Configuration › Générale › API* : activer l'API REST, créer un client d'API (App-Token, restreint à l'IP du serveur Strata), puis un compte de service avec un profil en lecture sur le parc, les logiciels, les lieux, les groupes et les utilisateurs, et son *jeton d'API* (*Préférences › Clés d'accès distant*).
- **phpIPAM** : *Administration › API* : créer une application (id `strata` par exemple), droits *Read*, sécurité *SSL with App code token* ; le code de l'application est le jeton.
- **Palo Alto** : un rôle d'administration avec *XML API › Export* et *Configuration* en lecture seule, un compte qui l'utilise, puis sa clé (`https://pare-feu/api/?type=keygen`) ; ou laissez le connecteur générer la clé avec l'utilisateur et le mot de passe.

`CONNECTORS=false` dans `.env` désactive complètement les connecteurs.

**Licence** : Strata est un logiciel libre sous [GNU AGPL v3](LICENSE). Vous pouvez l'utiliser, le modifier et le redistribuer ; si vous mettez une version **modifiée** à disposition d'utilisateurs via le réseau, vous devez leur donner accès à son code source. Le lien *Source code* en bas du panneau de contrôle pointe vers `SOURCE_URL` (dans `.env`) : faites-le pointer vers votre fork si vous modifiez le code.

Pour essayer sans brancher vos outils : chargez la démo, lancez `node scripts/connector-sim.mjs` (avec Docker : `docker compose exec -d strata node scripts/connector-sim.mjs`) (faux Cyberwatch, GLPI, phpIPAM et PAN-OS sur le port 8099, avec des données qui correspondent à l'IS Lyon) et reprenez les adresses et identifiants indiqués en tête du script.

## Nouveautés de la v0.4

- **Comptes nominatifs et rôles** (version auto-hébergée) :

  | Rôle | Peut |
  |---|---|
  | `viewer` | consulter la carte, les fiches, les plans et l'historique |
  | `contributor` | en plus, préparer des propositions (brouillons) et les soumettre |
  | `approver` | en plus, modifier la carte directement, valider ou refuser les propositions, restaurer une version |
  | `admin` | en plus, gérer les comptes |

  Le premier admin vient de `EDIT_USER` / `EDIT_PASS` (recréé ou réinitialisé à chaque démarrage, pratique en cas d'oubli). Les autres comptes se gèrent dans l'app (*Collaboration › Account*) ou en ligne de commande : `node scripts/users.mjs set alice contributor` (avec Docker : `docker compose exec strata node scripts/users.mjs set alice contributor`). Chacun change son mot de passe dans *Account*. Les mots de passe sont stockés hachés (scrypt) dans `data/users.json`.
- **Historique des versions et rollback** : chaque modification est enregistrée (qui, quand, quoi) dans `data/history.jsonl`. *Collaboration › History* liste les changements, pour l'IS ouvert ou toute la carte. *View* affiche la carte telle qu'elle était (lecture seule, bandeau jaune), *Restore* remet toute la carte à cette version. La restauration est elle-même une version : elle peut être annulée.
- **Propositions à valider** : un contributeur clique *Propose a change*, puis modifie la carte normalement (schéma 2D, fiches, formulaires). Tout va dans un brouillon (bandeau bleu *Draft*), la carte réelle ne bouge pas. *Submit for review* l'envoie aux validateurs.
  - Le validateur ouvre la proposition depuis *Proposals* : la carte s'affiche avec les changements appliqués, surlignés (vert : ajouté, orange : modifié, rouge pointillé : flux supprimé), et la liste détaillée des changements. Il commente, puis *Approve and publish* (la proposition devient une version de l'historique) ou *Reject* (l'auteur peut la reprendre).
  - Règle des quatre yeux : on ne valide pas sa propre proposition (sauf `ALLOW_SELF_APPROVAL=true`).
  - Si la carte a changé entre-temps sur les mêmes éléments, le validateur est prévenu et choisit de publier quand même ou non.
  - **Depuis un fichier** : *New proposal › A file* accepte un export JSON Strata (ou IS Map) (toute la carte, ou un seul IS exporté avec *Export this IS (JSON)* depuis la fiche de l'IS). Les différences avec la carte deviennent le contenu de la proposition.
- **Services Internet** : au lieu d'un seul nuage « Internet », on décrit les services autorisés (serveurs de mise à jour ESET, dépôts Ubuntu, Windows Update, NTP, SaaS…) avec leurs FQDN/IP et ports. Ils sont **partagés par tous les IS** (catalogue commun, vue d'ensemble) ou **propres à un IS** (bouton *+ This IS*). Les flux peuvent avoir un service comme source ou destination : ils apparaissent à côté du nuage en 3D, en tête du schéma 2D, dans les plans d'architecture, et l'export des règles firewall utilise leurs FQDN comme adresse de destination.

## Nouveautés de la v0.3

- **Schéma 2D synchronisé** : dans un SI, le sélecteur en haut de l'écran bascule entre *3D model* et *2D diagram*. Le schéma 2D montre exactement les mêmes données : une bande par niveau, les plateaux VLAN dans le même ordre, les équipements à la même place, les flux avec leurs équipements traversés.
  - Glisser un équipement le déplace sur son plateau, ou le fait changer de VLAN si on le lâche sur un autre plateau. La position est enregistrée et reprise dans la maquette 3D.
  - Glisser l'en-tête d'un plateau le déplace sur son niveau, ou le fait changer de zone si on le lâche sur un autre niveau.
  - Outil *+ Flow* (touche F) : appuyer sur l'équipement source et relâcher sur la destination (ou sur Internet) ouvre le formulaire du flux, déjà rempli.
  - Outil *+ Asset* (touche A) : cliquer sur un plateau à l'endroit voulu ouvre le formulaire d'un nouvel équipement sur ce VLAN.
  - Le bouton *Auto* d'un plateau rangé à la main revient au rangement automatique.
  - Les filtres (direction, exposition, sévérité, VLAN masqués), la fiche des équipements, le détail des flux, le plan 2D par équipement et les exports CSV fonctionnent pareil dans les deux vues. *Export SVG* enregistre le schéma complet du SI.
  - Le compte lecture seule peut consulter le schéma, sans rien déplacer.

## Nouveautés de la v0.2

- **Maquette plus lisible** : les pylônes sous les plateaux sont masqués par défaut (réglage *Layout › Standoffs* : Hidden, Thin ou Full) et les équipements sont rangés en grille serrée (*Asset spacing* : Compact ou Comfortable). La hauteur entre niveaux se règle dans *Display › Level height*.
- **Ranger les VLAN** : bouton *Arrange plates*, puis glisser un plateau n'importe où sur son niveau (gauche, droite, avant, arrière ; v0.4.2), le bouton *Line up* remet le niveau en ligne, ou utiliser les flèches qui apparaissent dans la liste des VLAN (en mode « 1 VLAN per floor », les flèches changent l'étage). L'ordre est enregistré dans le SI (`vlans[].pos`).
- **Flux à travers les équipements d'interconnexion** : chaque flux passe par les pare-feu, routeurs ou switchs qu'il traverse. Le chemin est proposé automatiquement (pare-feu de bordure pour Internet, pare-feu interne ou routeur de cœur entre VLAN) et se corrige flux par flux dans *Edit the flow › Path through the network*. Des cônes indiquent le sens à chaque saut ; survoler un fil affiche « source → équipements → destination », cliquer dessus ouvre le détail du flux. Nouveau type d'équipement : *Router / L3 core*.
- **OS et applications** : chaque équipement liste les applications qui tournent dessus (nom, version, ports d'écoute). La fiche montre l'équipement « ouvert » : applications, système, matériel. Un port exposé indique l'application qui l'écoute.
- **Plan d'architecture 2D** : depuis la fiche d'un équipement, bouton *2D plan*. Le plan montre l'équipement avec ses applications et son OS, ses flux directs, les équipements traversés et tous les chemins enregistrés depuis et vers Internet, rangés par zone et par VLAN. Export **SVG** (vectoriel, pour Confluence, Word, draw.io) ou **PNG**.
- **Exports CSV** depuis la fiche : *Flow matrix* (matrice de flux de l'équipement, avec le chemin et les pare-feu traversés) et *Firewall rules* (une règle d'autorisation par flux et par pare-feu traversé, regroupées par pare-feu ; pour un pare-feu, sa propre base de règles). Séparateur point-virgule et UTF-8, pour ouvrir directement dans Excel. Les flux qui ne traversent aucun pare-feu sont listés à la fin.

Le paquet contient l'application web et un petit serveur Node.js **sans dépendance** :

- les données sont partagées entre tous les utilisateurs et stockées dans un seul fichier JSON ;
- les modifications apparaissent en direct chez les autres utilisateurs ;
- l'accès est protégé par mot de passe, avec un compte éditeur et un compte lecture seule optionnel ;
- des sauvegardes automatiques sont faites au démarrage, chaque jour et avant chaque import ;
- tout fonctionne hors ligne : three.js et les polices sont servis localement, sans CDN ni Google Fonts.

```
strata/
├── public/            l'application (index.html, app.js, app.css)
├── server/server.js   le serveur (API + fichiers statiques)
├── scripts/           vendor.mjs (récupère three.js et les polices), users.mjs (comptes), backup.sh, restore.sh
├── deploy/            Caddyfile (HTTPS), strata.service (systemd)
├── tests/             tests de l'API (npm test)
├── Dockerfile, docker-compose.yml, .env.example
└── package.json
```

---

## 1. Prérequis

L'une des deux options suivantes :

- **Docker** avec Docker Compose v2 (`docker compose version`), recommandé ;
- **Node.js 20 ou plus** (`node --version`).

La machine a besoin d'un accès au registre npm **une seule fois**, lors de la construction, pour télécharger three.js 0.128 et les polices. Ensuite, l'application tourne sans Internet.

Côté utilisateurs, il faut un navigateur récent avec WebGL (Chrome, Edge, Firefox ou Safari récents).

---

## 2. Démarrage rapide avec Docker

```bash
cd strata
cp .env.example .env
nano .env                       # changez EDIT_PASS
docker compose up -d --build    # construit l'image ici (accès au registre npm nécessaire pendant la construction)
```

Sous Windows (PowerShell ou cmd) : `copy .env.example .env`, puis éditez `.env` avec le Bloc-notes (`notepad .env`).

Une fois une version publiée sur GitHub (tag `vX.Y.Z`, voir le workflow `Release`), `docker compose pull && docker compose up -d` récupère l'image toute prête `ghcr.io/solidgeeks/strata`. Avant cela, `pull` répond `denied` : l'image n'existe pas encore.

Chaque image publiée est **signée** : une attestation prouve qu'elle a été construite par le workflow `Release` de ce dépôt, à partir du code du tag. Pour le vérifier avant de la déployer (il faut la [CLI GitHub](https://cli.github.com/)) :

```bash
gh attestation verify oci://ghcr.io/solidgeeks/strata:0.5.4 --owner SolidGeeks
```

La commande doit afficher `Verification succeeded!`. Si elle échoue, n'utilisez pas l'image et signalez-le (voir [SECURITY.md](SECURITY.md)). Les images antérieures à 0.5.4 ne sont pas signées.

Ouvrez ensuite http://localhost:8080 et connectez-vous avec `EDIT_USER` / `EDIT_PASS`.

La carte est vide au départ. Pour l'explorer, cliquez sur **Load demo (5 IS)**. Pour repartir de zéro, cliquez sur **Delete everything**.

Commandes utiles :

```bash
docker compose logs -f strata    # journaux
docker compose restart strata    # redémarrer
docker compose down             # arrêter (les données restent dans le volume)
```

Par défaut, le port n'écoute que sur la machine elle-même (`127.0.0.1:8080`). Pour l'ouvrir à votre réseau, voir la section 4.

---

## 3. Configuration (`.env`)

| Variable | Défaut | Rôle |
|---|---|---|
| `EDIT_USER` / `EDIT_PASS` | `admin` / vide | Premier compte admin, recréé ou réinitialisé à chaque démarrage. **Sans `EDIT_PASS` et sans compte dans `data/users.json`, il n'y a aucune authentification.** |
| `VIEW_USER` / `VIEW_PASS` | `viewer` / vide | Compte lecture seule partagé, ignoré si `VIEW_PASS` est vide. |
| `ALLOW_SELF_APPROVAL` | `false` | `true` permet à un validateur de valider ses propres propositions. |
| `HISTORY_KEEP` | `5000` | Nombre de changements conservés dans l'historique. |
| `READ_ONLY` | `false` | Fige la carte pour tout le monde. |
| `BACKUP_KEEP` | `14` | Nombre de sauvegardes automatiques conservées. |
| `BACKUP_EVERY_HOURS` | `24` | Fréquence des sauvegardes automatiques. |
| `MAX_IMPORT_MB` | `20` | Taille maximale d'un fichier importé. |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | Écoute du serveur. |
| `DATA_DIR` | `/data` (Docker) | Dossier des données et des sauvegardes. |
| `SITE_ADDRESS` | — | Nom DNS utilisé par le proxy HTTPS (section 4). |
| `CONNECTORS` | activés | `false` désactive les connecteurs (Cyberwatch, GLPI, phpIPAM, Palo Alto). |
| `SOURCE_URL` | `https://github.com/SolidGeeks/strata` | Lien *Source code* de l'app (AGPL) : faites-le pointer vers votre fork si vous modifiez le code. |
| `DATA_VOLUME` | `strata-data` | Nom du volume Docker des données (reprise d'une installation IS Map, voir plus haut). |

Après une modification de `.env`, appliquez-la avec `docker compose up -d`.

---

## 4. Accès réseau et HTTPS

Les mots de passe circulent en Basic Auth : **n'exposez jamais l'application en HTTP simple en dehors de la machine**.

### Option A — proxy HTTPS fourni (Caddy)

1. Dans `.env`, renseignez `SITE_ADDRESS=strata.mondomaine.lan`, le nom que vos utilisateurs taperont.
2. Faites pointer ce nom vers la machine (DNS interne ou fichier hosts).
3. Lancez :
   ```bash
   docker compose --profile https up -d --build
   ```
4. Ouvrez https://strata.mondomaine.lan.

Le `Caddyfile` utilise `tls internal` : Caddy signe le certificat avec sa propre autorité locale, ce qui convient à un réseau interne ou à un VPN. Pour supprimer l'avertissement du navigateur, installez cette autorité sur vos postes :

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

Si le nom est public et joignable depuis Internet sur les ports 80 et 443, supprimez la ligne `tls internal` et Caddy obtiendra un certificat Let's Encrypt tout seul.

### Option B — votre reverse proxy existant (nginx, Traefik…)

Faites pointer le proxy vers `http://127.0.0.1:8080`. Les mises à jour en direct passent par Server-Sent Events sur `/api/events` : il faut **désactiver la mise en tampon** sur ce chemin. Exemple nginx :

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
}
location /api/events {
    proxy_pass http://127.0.0.1:8080;
    proxy_buffering off;
    proxy_read_timeout 1h;
}
```

L'application fonctionne aussi dans un sous-chemin (par exemple `https://intranet/strata/`), car elle n'utilise que des chemins relatifs.

---

## 5. Installation sans Docker (systemd)

```bash
sudo mkdir -p /opt/strata && sudo cp -r strata/* /opt/strata/
cd /opt/strata
sudo npm run setup        # npm install + copie de three.js et des polices dans public/vendor
sudo useradd --system --home /opt/strata --shell /usr/sbin/nologin strata
sudo mkdir -p /var/lib/strata && sudo chown strata:strata /var/lib/strata
sudo cp .env.example /etc/strata.env && sudo nano /etc/strata.env && sudo chmod 600 /etc/strata.env
sudo cp deploy/strata.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now strata
journalctl -u strata -f
```

Le service écoute sur `127.0.0.1:8080`. Placez un reverse proxy HTTPS devant, comme dans l'option B.

Pour un test rapide sur un poste :

```bash
npm run setup
EDIT_PASS=test npm start
```

Ouvrez ensuite http://localhost:8080.

---

## 6. Sauvegardes et restauration

Pour revenir sur une erreur de saisie, le plus simple est l'historique dans l'app (*Collaboration › History › Restore*). Les sauvegardes servent en cas de perte du serveur.

**Automatiques** : le serveur copie `db.json` dans `/data/backups/` au démarrage, toutes les `BACKUP_EVERY_HOURS` heures, avant chaque import et avant chaque restauration de version. Il garde les `BACKUP_KEEP` plus récentes.

**Manuelles** (Docker) :

```bash
./scripts/backup.sh                                          # backups/strata-AAAAMMJJ-HHMMSS.tar.gz : carte, historique, propositions, comptes
./scripts/restore.sh backups/strata-20261024-120000.tar.gz   # remet tout
./scripts/restore.sh export.json                             # remet seulement la carte (db.json ou Export JSON)
```

Le script de restauration sauvegarde automatiquement l'existant avant de le remplacer. Après la restauration d'un `db.json` seul, les lignes d'historique plus récentes que ce fichier sont ignorées.

Depuis l'interface, **Export JSON** télécharge la carte complète et **Import JSON** la recharge (sur la même instance ou une autre).

Pensez à inclure le dossier de sauvegardes ou le volume Docker `strata-data` dans votre sauvegarde habituelle.

---

## 7. Reprendre les données saisies dans la version Claude

1. Dans la version publiée sur Claude, sur la vue d'ensemble, cliquez sur **Export JSON** et enregistrez le fichier.
2. Dans votre instance, connecté en éditeur, cliquez sur **Import JSON** et choisissez ce fichier.

Le format est le même : SI, zones, VLAN, équipements, contacts, flux et liens inter-SI sont repris tels quels. Un export de la v0.1 s'importe sans changement dans la v0.2 : les chemins des flux sont alors proposés automatiquement.

---

## 8. Mise à jour

```bash
./scripts/backup.sh
# remplacez les fichiers du dossier par la nouvelle version (gardez votre .env)
docker compose up -d --build
```

Les données vivent dans le volume Docker et ne sont pas touchées par la reconstruction.

---

## 9. API (pour automatiser)

Toutes les routes demandent les mêmes identifiants que l'interface, avec les droits du rôle du compte (les écritures directes demandent `approver`). Les écritures exigent les en-têtes `Content-Type: application/json` et `X-Requested-With: strata` (`is-map` reste accepté). Un script peut grouper plusieurs écritures en une seule entrée d'historique avec les en-têtes `X-Batch: <identifiant>` et `X-Batch-Label: <libellé encodé en URL>`. Pour qu'un outil propose au lieu d'écrire, donnez-lui un compte `contributor` et passez par `POST /api/proposals` avec `{"title", "siteId", "changes": {"si": {...}, "assets": {...}}}` (un document à `null` = suppression).

| Méthode et route | Rôle |
|---|---|
| `GET /api/state` | Toute la carte : `{si, assets, wan, rev}` |
| `GET /api/export` | Même contenu, en fichier à télécharger |
| `PUT /api/si/{id}` | Crée ou remplace un SI (zones, VLAN, flux, contacts) |
| `DELETE /api/si/{id}` | Supprime un SI (pas ses équipements) |
| `PUT /api/assets/{id}` | Crée ou remplace un équipement |
| `DELETE /api/assets/{id}` | Supprime un équipement |
| `PUT /api/wan` | Remplace les liens inter-SI : `{"links": [...]}` |
| `POST /api/import` | Remplace toute la carte : `{si, assets, wan, services}` |
| `PUT /api/services` | Remplace le catalogue commun des services Internet : `{"services": [...]}` |
| `GET /api/history` | Derniers changements (`?before=REV&limit=N`) ; `GET /api/history/{rev}` : le détail avant/après |
| `GET /api/state?at=REV` | La carte telle qu'elle était juste après la version REV |
| `POST /api/rollback` | `{"rev": N}` : remet la carte à la version N (approver) |
| `GET/POST /api/proposals`, `GET/PUT/DELETE /api/proposals/{id}` | Propositions ; `POST …/{id}/submit`, `/withdraw`, `/comment`, `/approve` (`{"force": true}` en cas de conflit), `/reject` |
| `GET /api/users`, `PUT/DELETE /api/users/{name}` | Comptes (admin) ; `PUT /api/me/password` : `{"current","next"}` |
| `GET /api/connectors` | Connecteurs, réglages (secrets masqués) et dernières synchronisations |
| `PUT /api/connectors/{id}` | Réglages d'un connecteur (admin) ; `id` : `cyberwatch`, `glpi`, `phpipam`, `paloalto` |
| `POST /api/connectors/{id}/test` | Teste l'accès (approver) |
| `POST /api/connectors/{id}/run` | Lance une synchronisation (approver) ; `{"wait": true}` attend le résultat. Palo Alto : `{"xml": "<config>…", "fileName": "…", "overrides": {"site", "firewall", "scope"}}` importe un fichier (contributor) |
| `GET /api/events` | Flux SSE : `event: change` avec la nouvelle révision, `proposals`, `connectors` |
| `GET /healthz` | Santé (sans authentification) |

Exemple : ajouter un équipement depuis un script (inventaire, NetBox, export de scanner…) :

```bash
curl -u admin:MOTDEPASSE -H 'Content-Type: application/json' -H 'X-Requested-With: strata' \
  -X PUT https://strata.mondomaine.lan/api/assets/srv-erp-01 \
  -d '{"site":"lyon","name":"srv-erp-01","type":"server","vlan":"v-lyo-20","ip":"10.20.0.20",
       "os":"RHEL 8","role":"ERP","crit":3,
       "vulns":[{"id":"CVE-2021-44228","title":"Log4Shell","cvss":10,"sev":"crit"}],
       "contacts":[{"name":"Application team","role":"Technical owner","phone":"+33 1 99 00 18 66","email":"apps@exemple.fr","dispo":"Business hours"}],
       "notes":""}'
```

Le plus simple pour connaître la structure exacte est de faire un **Export JSON** de la démo.

Les **flux** et les **VLAN** sont stockés dans le document du SI (`si.flows`, `si.vlans`). Pour en ajouter par script : lisez le SI avec `GET /api/state`, modifiez-le, puis renvoyez-le avec `PUT /api/si/{id}`.

Champs ajoutés en v0.2 (tous facultatifs) :

| Champ | Où | Contenu |
|---|---|---|
| `apps` | équipement | `[{"name":"Apache Tomcat","version":"9.0.54","ports":["tcp/8080","tcp/443"]}]` |
| `via` | flux | identifiants des équipements traversés, dans l'ordre, par ex. `["lyo-fw-edge","lyo-fw-int"]`. Absent : chemin proposé automatiquement. `[]` : flux direct imposé. |
| `place` | VLAN | (v0.4.2) position du plateau sur son niveau, `[x, z]` depuis le centre du niveau. Absent sur tout le niveau : plateaux alignés de gauche à droite. |
| `pos` | VLAN | position de gauche à droite dans sa zone (0, 1, 2…). Absent : tri par numéro de VLAN. |
| `services` | racine de la carte, et IS | services Internet : `[{"id":"svc-eset","name":"ESET update servers","category":"Antivirus / EDR","hosts":["update.eset.com"],"ports":["tcp/443"],"notes":""}]` ; dans un flux, la source ou la destination `"svc:svc-eset"` |
| `layout` | VLAN | (v0.3) positions posées à la main dans le schéma 2D : `{"lyo-app-erp":[3.75,0.5], …}`, en unités du plateau depuis son centre (x vers la droite, z vers l'avant). Absent : rangement automatique. |
| `type: "router"` | équipement | nouveau type *Router / L3 core* |
| `ext` | équipement, VLAN | (v0.5) identifiants dans les outils connectés : `{"glpi":"Computer/12","cyberwatch":101,"ipam":"57"}` |
| `src` | vulnérabilité, application, contact | (v0.5) `cyberwatch` ou `glpi` quand l'entrée vient d'un connecteur (les autres sont considérées comme saisies à la main) |
| `pan` | flux | (v0.5) règle(s) Palo Alto à l'origine du flux : `{"rules":["in-web"],"scope":"vsys1"}` |

---

## 10. Sécurité

Cette carte décrit précisément vos points faibles : traitez-la comme une donnée sensible.

- Gardez-la sur un réseau interne ou derrière un VPN, en HTTPS, avec un `EDIT_PASS` long et unique.
- Donnez le compte `viewer` aux personnes qui n'ont qu'à consulter.
- Le serveur envoie des en-têtes de sécurité stricts (CSP sans script externe, pas d'intégration en iframe, pas de référent) et refuse les écritures inter-sites.
- Les images Docker publiées sont signées (attestation de provenance Sigstore) : vérifiez-les avec `gh attestation verify` (section 2).
- Ces protections (authentification, rôles, écritures inter-sites, règle des quatre yeux, accès aux fichiers du serveur) sont vérifiées par les tests automatiques à chaque modification du code (section 13).
- Donnez à chacun un compte nominatif avec le rôle le plus bas qui suffit : chaque changement est attribué dans l'historique.
- Connecteurs : utilisez des comptes de service en **lecture seule** dans Cyberwatch, GLPI, phpIPAM et PAN-OS, restreints à l'IP du serveur Strata quand l'outil le permet. Leurs secrets sont dans `data/connectors.json` : protégez le volume et les archives de sauvegarde.

---

## 11. Dépannage

| Symptôme | Piste |
|---|---|
| Page blanche, rien en 3D | `public/vendor/` manque : relancez `docker compose up -d --build` ou `npm run setup`, et vérifiez l'accès au registre npm pendant la construction. |
| Badge « This browser only » en haut à gauche | La page ne joint pas l'API : elle est ouverte en fichier local, ou le proxy bloque `/api/`. |
| Les autres utilisateurs ne voient les changements qu'après un rechargement | Le proxy met en tampon `/api/events` (voir section 4, option B). |
| « You have read-only access » | Vous êtes connecté avec le compte viewer, ou `READ_ONLY=true`. |
| Changer de compte dans le navigateur | Le navigateur garde les identifiants Basic Auth : ouvrez une fenêtre privée ou fermez le navigateur. |
| Erreur de droits sur `/data` (Docker) | Gardez le volume nommé de `docker-compose.yml`. Si vous montez un dossier de l'hôte, donnez-le à l'UID 1000 : `chown -R 1000:1000 ./data`. |

---

## 12. Limites de la v0.5

- Le stockage est un seul fichier JSON, adapté à quelques milliers d'équipements. Au-delà, il faudra passer à une vraie base.
- L'authentification reste en Basic Auth (identifiants demandés par le navigateur). Pour du SSO (Entra ID, LDAP…), placez un proxy d'authentification devant et créez les mêmes noms de comptes.
- Deux approbateurs qui modifient directement le même IS en même temps : la dernière sauvegarde l'emporte (l'historique permet de revenir en arrière). Les propositions, elles, détectent les conflits.
- L'import de schémas draw.io ou Visio n'est pas pris en charge : seuls les exports JSON Strata peuvent devenir une proposition.
- La version Claude (artefact) n'a ni comptes, ni historique, ni propositions : seulement les services Internet.
- Le chemin proposé pour les flux suit une règle simple (pare-feu de bordure, puis pare-feu interne ou routeur de cœur). Vérifiez-le pour les architectures à plusieurs pare-feu en cascade et corrigez-le flux par flux si besoin.
- Les règles firewall exportées sont un tableau générique, pas une configuration prête à coller : les noms d'interfaces et d'objets de vos pare-feu restent à faire correspondre.
- Les connecteurs ont été écrits d'après la documentation publique des API (Cyberwatch v3, GLPI `apirest.php` 9.5/10, phpIPAM 1.4+, PAN-OS 10/11) et testés contre des simulateurs, pas contre vos instances : faites un premier *Test the connection* puis une synchronisation, et relisez la proposition avant de la publier. Les champs propres à votre version (chemin Cyberwatch, règles de lieu) se règlent sans toucher au code.
- Palo Alto : les règles NAT, les profils de sécurité, les groupes d'adresses dynamiques et la hiérarchie des groupes de périphériques Panorama ne sont pas interprétés ; seules les règles de sécurité *allow*. Une règle trop large (`any` interne, grande plage) est signalée au lieu d'être dessinée.
- GLPI : un appel par équipement (plus un par technicien et par logiciel inconnu, mis en cache) ; comptez quelques minutes pour plusieurs milliers d'équipements. Le nouveau API GLPI 11 (`/api.php/v2`) n'est pas encore pris en charge.
- NetBox et NetFlow ne sont pas encore connectés.

## 13. Développement et tests

```bash
npm test
```

Les tests démarrent un vrai serveur sur un dossier de données temporaire, créent un compte par rôle et vérifient l'API par HTTP : authentification, rôles, protection contre les écritures inter-sites, cycle des propositions et règle des quatre yeux, conflits, historique et rollback, import (ids, taille maximale), et impossibilité de lire les fichiers du serveur avec `../`. Aucune dépendance à installer : il faut seulement Node.js 20 ou plus.

Le workflow `CI` les lance sur Node 20 et 22 à chaque push sur `main` et à chaque pull request. Une modification qui touche à l'API doit être accompagnée d'un test.

Les contributions suivent le [Solid standard](https://github.com/SolidGeeks/.github/blob/main/CONTRIBUTING.md) : commits signés avec `git commit -s` (DCO), pas de CLA. Pour signaler une vulnérabilité : [SECURITY.md](SECURITY.md).
