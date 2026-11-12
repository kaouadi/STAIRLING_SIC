# Journal des écritures comptables — Stairling Union 2025

Application React buildée avec **Vite** + **vite-plugin-singlefile**.  
Le build produit un **seul fichier HTML autonome** — aucune connexion réseau, aucun serveur requis.

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js ≥ 18** — https://nodejs.org

### 1. Installer les dépendances

```bash
npm install
```

### 2a. Générer le fichier standalone

```bash
npm run build
```

➡️ Le fichier final est dans **`dist/index.html`**  
Ouvrez-le en double-cliquant dessus — aucun serveur requis.

### 2b. Lancer en mode développement (avec hot-reload)

```bash
npm run dev
```

➡️ Ouvre automatiquement **http://localhost:5173**

---

## 📁 Structure du projet

```
journal-app/
├── index.html                        ← point d'entrée HTML
├── vite.config.js                    ← config Vite + plugin singlefile
├── package.json                      ← dépendances
└── src/
    ├── main.jsx                      ← bootstrap React
    ├── index.css                     ← styles globaux
    └── JournalEcritures.jsx          ← composant principal
```

---

## ⚙️ Comment ça fonctionne

| Étape | Ce qui se passe |
|---|---|
| `npm install` | Installe Vite, React, et le plugin singlefile en local |
| `npm run build` | Vite compile et transpile tout le JSX → JS natif |
| `vite-plugin-singlefile` | Inline tout (JS + CSS) dans un seul `index.html` |
| Résultat | **1 fichier .html ~400 Ko**, 100% autonome, hors-ligne |

---

## 🆚 Différence avec Babel CDN

| | Babel CDN | Vite + singlefile |
|---|---|---|
| Compilation JSX | Dans le navigateur à chaque ouverture | En local, une seule fois |
| Connexion réseau à l'exécution | ✅ requise | ❌ aucune |
| Vitesse d'ouverture | Lente (transpilation live) | Instantanée |
| Utilisable hors-ligne | ❌ | ✅ |
