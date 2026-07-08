# AsanaBar

Application **macOS menu bar** pour [Asana](https://asana.com) : voir d'un coup d'œil les
commentaires où l'on est **@mentionné** (les lire, y répondre, les ouvrir) et ses
**tâches du jour** (copier les liens en un clic).

Basée sur le squelette de [JitBitBar](https://github.com/ldubois/jitbitbar), lui-même
fork de [BugSnagBar](https://github.com/yoanbernabeu/BugSnagBar) (Yoan Bernabeu, MIT).

## Fonctionnalités

- **Logo Asana (les trois boules)** dans la barre de menus, coloré selon l'état :
  - 🔴 rouge — mentions non lues
  - 🟠 orange — tâches à échéance aujourd'hui (ou en retard)
  - 🟢 vert — tout est traité
  - ⚪ gris — non configuré / erreur
- **Mentions** : commentaires des 14 derniers jours (fenêtre réglable) où quelqu'un t'a
  @mentionné. Clic pour lire le commentaire complet, **Ouvrir** dans Asana, **Commenter**
  pour répondre directement dans la tâche, **👍 Vu** pour marquer comme traité.
  Aucun état local : « vu » = un like sur le commentaire dans Asana (visible par l'auteur,
  partagé entre tous tes Macs), et répondre dans la tâche masque aussi la mention.
  (L'API Asana n'expose pas la boîte de réception : l'archivage inbox n'est pas accessible.)
- **Aujourd'hui** : tes tâches assignées dues aujourd'hui ou en retard, avec
  **Copier le lien** par tâche et **Copier les N liens** en une fois.
- **⌁ Warp** : bouton par tâche qui ouvre une session [Warp](https://www.warp.dev)
  dans un répertoire projet et y lance une commande (par défaut
  `claude "/asana-task {url}"`, `{url}` étant remplacé par le lien de la tâche).
  Répertoire, commande et activation réglables dans **Réglages → Général →
  Ouvrir dans Warp**. Techniquement : AsanaBar écrit une
  [launch configuration](https://docs.warp.dev/terminal/sessions/launch-configurations)
  dans `~/.warp/launch_configurations/asanabar-task.yaml` puis l'ouvre via
  l'URI `warp://launch/…`.
- **Notifications macOS** à l'arrivée d'une nouvelle mention (clic → ouvre la tâche).
- Thème clair/sombre automatique.

## Configuration

1. Lancer AsanaBar → clic sur l'icône → **réglages**.
2. Coller un **Personal Access Token** Asana
   (Asana → Settings → Apps → *Personal access tokens*).
3. **Tester & enregistrer** — l'espace de travail est détecté automatiquement
   (sélectionnable s'il y en a plusieurs).

Le token est chiffré via `safeStorage` (Keychain macOS). Il ne quitte jamais la machine :
l'app parle uniquement à `app.asana.com`.

> ℹ️ La détection des mentions utilise l'API de recherche Asana (plan Premium).
> Sans Premium, l'app se replie sur les commentaires de tes tâches assignées.

## Développement

```sh
npm install
npm start            # dev
npm run lint         # eslint
npm run make         # DMG + ZIP dans out/make/
npm run generate-icons
```

## Installation

Télécharger le DMG depuis les [Releases](https://github.com/ldubois/asanabar/releases)
(`arm64` = Apple Silicon, `x64` = Mac Intel), ou :

```sh
./install.sh
```

## Licence

MIT
