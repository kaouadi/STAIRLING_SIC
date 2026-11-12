# Balance Comptable — Stairling Union 2025

Application React buildée avec **Vite** + **vite-plugin-singlefile**.
Le build produit un **seul fichier HTML autonome** — aucune connexion réseau, aucun serveur requis.

## 🚀 3 commandes

```bash
npm install
npm run build
# → dist/index.html  ✅  double-cliquez pour ouvrir
```

## 📁 Structure

```
balance-app-v13/
├── index.html              ← point d'entrée HTML
├── vite.config.js          ← Vite + plugin singlefile
├── package.json
└── src/
    ├── main.jsx            ← bootstrap React
    ├── index.css           ← styles globaux + police DM Sans
    └── BalanceComptable.jsx
```
