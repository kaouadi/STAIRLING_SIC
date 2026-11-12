# Grand Livre — Lettrage interactif · Stairling Union 2025

Application React buildée avec **Vite** + **vite-plugin-singlefile**.  
Le build produit un **seul fichier HTML autonome** — aucune connexion réseau, aucun serveur requis.

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js ≥ 18** → https://nodejs.org

### 1. Installer les dépendances
```bash
npm install
```

### 2a. Générer le fichier standalone
```bash
npm run build
```
➡️ **`dist/index.html`** — ouvrez-le directement dans votre navigateur, aucun serveur requis.

### 2b. Mode développement (hot-reload)
```bash
npm run dev
```
➡️ http://localhost:5173

---

## 📁 Structure
```
grand-livre-app/
├── index.html                    ← point d'entrée HTML
├── vite.config.js                ← Vite + plugin singlefile
├── package.json
└── src/
    ├── main.jsx                  ← bootstrap React
    ├── index.css                 ← styles globaux
    └── GrandLivreComplet.jsx     ← composant principal
```
