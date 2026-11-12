import { useState, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════
// DONNÉES — copiées intégralement du grand_livre_lettrage_draft_10.jsx
// ═══════════════════════════════════════════════════════════════════════

const ACCOUNT_NAMES = {
  "101000":"Capital social","106100":"Réserve légale","120000":"Résultat de l'exercice",
  "218200":"Matériel de transport","218300":"Matériel de bureau et informatique","280000":"Amort. immobilisations incorporelles",
  "310000":"Stocks de matières premières",
  "4110UBER":"Clients — UBER","4110BOLT":"Clients — BOLT","4110HEETCH":"Clients — HEETCH",
  "4010UBER":"Fournisseurs — UBER (commissions)","4010BOLT":"Fournisseurs — BOLT (commissions)","4010HEETCH":"Fournisseurs — HEETCH (commissions)",
  "4210DUPONT":"Rémunérations dues — DUPONT","4210XAVIER":"Rémunérations dues — XAVIER","4210KARIM":"Rémunérations dues — KARIM",
  "445711UBER":"TVA collectée UBER 10%","445711BOLT":"TVA collectée BOLT 10%","445711HEETCH":"TVA collectée HEETCH 10%",
  "445660UBER":"TVA déduct. comm. UBER 20% (autoliq.)","445660BOLT":"TVA déduct. comm. BOLT 20% (autoliq.)",
  "512000":"Banque Société Générale",
  "62261DUPONT":"Commission UBER — DUPONT","62261XAVIER":"Commission UBER — XAVIER","62262DUPONT":"Commission BOLT — DUPONT",
  "6061DUPONT":"Carburant — DUPONT","6061XAVIER":"Carburant — XAVIER","6135DUPONT":"Location véhicule — DUPONT",
  "6152DUPONT":"Entretien véhicule — DUPONT","6155DUPONT":"Téléphonie — DUPONT","6251DUPONT":"Péages & déplacements — DUPONT",
  "6811DUPONT":"Dotation amort. véhicule — DUPONT",
  "7061DUPONT":"Ventes UBER — DUPONT","7061XAVIER":"Ventes UBER — XAVIER","7061KARIM":"Ventes UBER — KARIM",
  "7062DUPONT":"Ventes BOLT — DUPONT","7062XAVIER":"Ventes BOLT — XAVIER","7063DUPONT":"Ventes HEETCH — DUPONT",
};

const ACCOUNT_CLASSES = {
  "1":{label:"Comptes de capitaux",color:"#7c3aed"},
  "2":{label:"Comptes d'immobilisations",color:"#9333ea"},
  "3":{label:"Comptes de stocks et d'en-cours",color:"#a855f7"},
  "4":{label:"Comptes de tiers",color:"#2563eb"},
  "5":{label:"Comptes financiers",color:"#0891b2"},
  "6":{label:"Comptes de charges",color:"#dc2626"},
  "7":{label:"Comptes de produits",color:"#16a34a"},
};
const getAC = a => ACCOUNT_CLASSES[a.charAt(0)] || {label:"Autre",color:"#78716c"};

// Comptes racines — uniquement ceux qui servent à la centralisation (401 et 411)
// Racines initiales — les classes 1-7 sont des racines, avec sous-racines imbriquées
const INITIAL_ROOTS = [
  { number: "1", name: "COMPTES DE CAPITAUX", cls: "1", children: ["101000","106100","120000"],
    subRoots: [] },
  { number: "2", name: "COMPTES D'IMMOBILISATIONS", cls: "2", children: ["218200","218300","280000"],
    subRoots: [] },
  { number: "3", name: "COMPTES DE STOCKS ET D'EN-COURS", cls: "3", children: ["310000"],
    subRoots: [] },
  { number: "4", name: "COMPTES DE TIERS", cls: "4", children: [],
    subRoots: [
      { number: "401", name: "FOURNISSEURS", cls: "4", children: ["4010UBER","4010BOLT","4010HEETCH"] },
      { number: "411", name: "CLIENTS", cls: "4", children: ["4110UBER","4110BOLT","4110HEETCH"] },
      { number: "421", name: "RÉMUNÉRATIONS DUES", cls: "4", children: ["4210DUPONT","4210KARIM","4210XAVIER"] },
      { number: "445", name: "TVA", cls: "4", children: ["445660BOLT","445660UBER","445711BOLT","445711HEETCH","445711UBER"] },
    ]},
  { number: "5", name: "COMPTES FINANCIERS", cls: "5", children: ["512000"],
    subRoots: [] },
  { number: "6", name: "COMPTES DE CHARGES", cls: "6", children: [],
    subRoots: [
      { number: "606", name: "ACHATS NON STOCKÉS", cls: "6", children: ["6061BOLT","6061HEETCH","6061UBER"] },
      { number: "613", name: "LOCATIONS", cls: "6", children: ["6135BOLT","6135HEETCH","6135UBER"] },
      { number: "615", name: "ENTRETIEN", cls: "6", children: ["6152BOLT","6155BOLT","6155HEETCH","6155UBER"] },
      { number: "622", name: "COMMISSIONS", cls: "6", children: ["6226BOLT","6226HEETCH","6226UBER"] },
      { number: "625", name: "DÉPLACEMENTS", cls: "6", children: ["6251BOLT","6251HEETCH","6251UBER"] },
      { number: "681", name: "DOTATIONS AUX AMORTISSEMENTS", cls: "6", children: ["6811BOLT","6811HEETCH","6811UBER"] },
    ]},
  { number: "7", name: "COMPTES DE PRODUITS", cls: "7", children: [],
    subRoots: [
      { number: "706", name: "PRESTATIONS DE SERVICES", cls: "7", children: ["7061DUPONT","7061HEETCH","7061KARIM","7061UBER","7061XAVIER","7062DUPONT","7062HEETCH","7062KARIM","7062UBER","7062XAVIER","7063DUPONT","7063HEETCH","7063KARIM","7063UBER","7063XAVIER"] },
    ]},
];

const CENTRALIZED_ROOTS = ["401","411"];

const ENTRIES = [
  {id:100,date:"2025-01-01",account:"101000",label:"Capital social — apport initial",journal:"AN",piece:"AN-2025-001",debit:0,credit:10000.00,lettre:""},
  {id:101,date:"2025-01-01",account:"106100",label:"Réserve légale",journal:"AN",piece:"AN-2025-002",debit:0,credit:1500.00,lettre:""},
  {id:102,date:"2025-01-01",account:"120000",label:"Report à nouveau exercice N-1",journal:"AN",piece:"AN-2025-003",debit:0,credit:3200.00,lettre:""},
  {id:103,date:"2025-01-01",account:"218200",label:"Véhicule Peugeot e-208 — valeur brute",journal:"AN",piece:"AN-2025-004",debit:32000.00,credit:0,lettre:""},
  {id:104,date:"2025-01-01",account:"218300",label:"Ordinateur portable + smartphone",journal:"AN",piece:"AN-2025-005",debit:2400.00,credit:0,lettre:""},
  {id:105,date:"2025-01-01",account:"280000",label:"Amort. cumulés immob. — report",journal:"AN",piece:"AN-2025-006",debit:0,credit:8000.00,lettre:""},
  {id:106,date:"2025-01-31",account:"280000",label:"Dotation amort. janv. 2025",journal:"OD",piece:"DOT-2025-001",debit:0,credit:533.33,lettre:""},
  {id:107,date:"2025-01-01",account:"310000",label:"Stock pièces détachées — report",journal:"AN",piece:"AN-2025-007",debit:850.00,credit:0,lettre:""},
  {id:108,date:"2025-01-31",account:"6811DUPONT",label:"Dotation amort. véhicule janv.",journal:"OD",piece:"DOT-2025-001",debit:533.33,credit:0,lettre:""},
  {id:1,date:"2025-01-05",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 05/01",journal:"JVT_UBER",piece:"VU-2025-001",debit:0,credit:1540.00,lettre:""},
  {id:2,date:"2025-01-06",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 06/01",journal:"JVT_UBER",piece:"VU-2025-002",debit:0,credit:1320.00,lettre:""},
  {id:3,date:"2025-01-07",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 07/01",journal:"JVT_UBER",piece:"VU-2025-003",debit:0,credit:1680.50,lettre:""},
  {id:4,date:"2025-01-12",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 12/01",journal:"JVT_UBER",piece:"VU-2025-010",debit:0,credit:1890.00,lettre:""},
  {id:5,date:"2025-01-19",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 19/01",journal:"JVT_UBER",piece:"VU-2025-018",debit:0,credit:1290.00,lettre:""},
  {id:6,date:"2025-01-26",account:"7061DUPONT",label:"CA journalier UBER — DUPONT 26/01",journal:"JVT_UBER",piece:"VU-2025-025",debit:0,credit:2010.00,lettre:""},
  {id:7,date:"2025-01-05",account:"7061XAVIER",label:"CA journalier UBER — XAVIER 05/01",journal:"JVT_UBER",piece:"VU-2025-040",debit:0,credit:1180.00,lettre:""},
  {id:8,date:"2025-01-12",account:"7061XAVIER",label:"CA journalier UBER — XAVIER 12/01",journal:"JVT_UBER",piece:"VU-2025-041",debit:0,credit:1450.00,lettre:""},
  {id:9,date:"2025-01-19",account:"7061XAVIER",label:"CA journalier UBER — XAVIER 19/01",journal:"JVT_UBER",piece:"VU-2025-042",debit:0,credit:980.00,lettre:""},
  {id:10,date:"2025-01-05",account:"7061KARIM",label:"CA journalier UBER — KARIM 05/01",journal:"JVT_UBER",piece:"VU-2025-060",debit:0,credit:1620.00,lettre:""},
  {id:11,date:"2025-01-12",account:"7061KARIM",label:"CA journalier UBER — KARIM 12/01",journal:"JVT_UBER",piece:"VU-2025-061",debit:0,credit:1780.00,lettre:""},
  {id:12,date:"2025-01-06",account:"7062DUPONT",label:"CA journalier BOLT — DUPONT 06/01",journal:"JVT_BOLT",piece:"VB-2025-001",debit:0,credit:920.00,lettre:""},
  {id:13,date:"2025-01-13",account:"7062DUPONT",label:"CA journalier BOLT — DUPONT 13/01",journal:"JVT_BOLT",piece:"VB-2025-002",debit:0,credit:1140.00,lettre:""},
  {id:14,date:"2025-01-07",account:"7062XAVIER",label:"CA journalier BOLT — XAVIER 07/01",journal:"JVT_BOLT",piece:"VB-2025-010",debit:0,credit:780.00,lettre:""},
  {id:15,date:"2025-01-08",account:"7063DUPONT",label:"CA journalier HEETCH — DUPONT 08/01",journal:"VT",piece:"VH-2025-001",debit:0,credit:460.00,lettre:""},
  {id:20,date:"2025-01-05",account:"4110UBER",label:"Facture ventes UBER sem.01 (agrégé)",journal:"JVT_UBER",piece:"FVU-2025-S01",debit:4840.00,credit:0,lettre:"AA"},
  {id:21,date:"2025-01-12",account:"4110UBER",label:"Facture ventes UBER sem.02",journal:"JVT_UBER",piece:"FVU-2025-S02",debit:5126.50,credit:0,lettre:"BB"},
  {id:22,date:"2025-01-15",account:"4110UBER",label:"Règlement UBER sem.01",journal:"BQ",piece:"RG-2025-011",debit:0,credit:4840.00,lettre:"AA"},
  {id:23,date:"2025-01-19",account:"4110UBER",label:"Facture ventes UBER sem.03",journal:"JVT_UBER",piece:"FVU-2025-S03",debit:3980.00,credit:0,lettre:""},
  {id:24,date:"2025-01-22",account:"4110UBER",label:"Règlement UBER sem.02",journal:"BQ",piece:"RG-2025-012",debit:0,credit:5126.50,lettre:"BB"},
  {id:25,date:"2025-01-26",account:"4110UBER",label:"Facture ventes UBER sem.04",journal:"JVT_UBER",piece:"FVU-2025-S04",debit:6210.00,credit:0,lettre:""},
  {id:30,date:"2025-01-06",account:"4110BOLT",label:"Facture ventes BOLT sem.01",journal:"JVT_BOLT",piece:"FVB-2025-S01",debit:2280.00,credit:0,lettre:"DD"},
  {id:31,date:"2025-01-13",account:"4110BOLT",label:"Facture ventes BOLT sem.02",journal:"JVT_BOLT",piece:"FVB-2025-S02",debit:1920.00,credit:0,lettre:""},
  {id:32,date:"2025-01-18",account:"4110BOLT",label:"Règlement BOLT sem.01",journal:"BQ",piece:"RG-2025-031",debit:0,credit:2280.00,lettre:"DD"},
  {id:35,date:"2025-01-08",account:"4110HEETCH",label:"Facture ventes HEETCH sem.01",journal:"VT",piece:"FVH-2025-S01",debit:506.00,credit:0,lettre:""},
  {id:40,date:"2025-01-05",account:"445711UBER",label:"TVA collectée UBER 10% sem.01",journal:"JVT_UBER",piece:"FVU-2025-S01",debit:0,credit:440.00,lettre:""},
  {id:41,date:"2025-01-12",account:"445711UBER",label:"TVA collectée UBER 10% sem.02",journal:"JVT_UBER",piece:"FVU-2025-S02",debit:0,credit:466.05,lettre:""},
  {id:42,date:"2025-01-19",account:"445711UBER",label:"TVA collectée UBER 10% sem.03",journal:"JVT_UBER",piece:"FVU-2025-S03",debit:0,credit:361.82,lettre:""},
  {id:43,date:"2025-01-26",account:"445711UBER",label:"TVA collectée UBER 10% sem.04",journal:"JVT_UBER",piece:"FVU-2025-S04",debit:0,credit:564.55,lettre:""},
  {id:44,date:"2025-01-06",account:"445711BOLT",label:"TVA collectée BOLT 10% sem.01",journal:"JVT_BOLT",piece:"FVB-2025-S01",debit:0,credit:207.27,lettre:""},
  {id:45,date:"2025-01-13",account:"445711BOLT",label:"TVA collectée BOLT 10% sem.02",journal:"JVT_BOLT",piece:"FVB-2025-S02",debit:0,credit:174.55,lettre:""},
  {id:46,date:"2025-01-08",account:"445711HEETCH",label:"TVA collectée HEETCH 10% sem.01",journal:"VT",piece:"FVH-2025-S01",debit:0,credit:46.00,lettre:""},
  {id:50,date:"2025-01-10",account:"62261DUPONT",label:"Commission UBER sem.01 — DUPONT",journal:"HA",piece:"CU-2025-D01",debit:908.10,credit:0,lettre:""},
  {id:51,date:"2025-01-17",account:"62261DUPONT",label:"Commission UBER sem.02 — DUPONT",journal:"HA",piece:"CU-2025-D02",debit:756.00,credit:0,lettre:""},
  {id:52,date:"2025-01-24",account:"62261DUPONT",label:"Commission UBER sem.03 — DUPONT",journal:"HA",piece:"CU-2025-D03",debit:516.00,credit:0,lettre:""},
  {id:53,date:"2025-01-10",account:"62261XAVIER",label:"Commission UBER sem.01 — XAVIER",journal:"HA",piece:"CU-2025-X01",debit:472.00,credit:0,lettre:""},
  {id:54,date:"2025-01-17",account:"62261XAVIER",label:"Commission UBER sem.02 — XAVIER",journal:"HA",piece:"CU-2025-X02",debit:580.00,credit:0,lettre:""},
  {id:55,date:"2025-01-13",account:"62262DUPONT",label:"Commission BOLT sem.01 — DUPONT",journal:"HA",piece:"CB-2025-D01",debit:368.00,credit:0,lettre:""},
  {id:60,date:"2025-01-10",account:"4010UBER",label:"Facture commission UBER sem.01",journal:"HA",piece:"FCU-2025-S01",debit:0,credit:1380.10,lettre:"EE"},
  {id:61,date:"2025-01-17",account:"4010UBER",label:"Facture commission UBER sem.02",journal:"HA",piece:"FCU-2025-S02",debit:0,credit:1336.00,lettre:""},
  {id:62,date:"2025-01-20",account:"4010UBER",label:"Règlement commission UBER sem.01",journal:"BQ",piece:"RG-2025-060",debit:1380.10,credit:0,lettre:"EE"},
  {id:63,date:"2025-01-13",account:"4010BOLT",label:"Facture commission BOLT sem.01",journal:"HA",piece:"FCB-2025-S01",debit:0,credit:368.00,lettre:"FF"},
  {id:64,date:"2025-01-25",account:"4010BOLT",label:"Règlement commission BOLT sem.01",journal:"BQ",piece:"RG-2025-063",debit:368.00,credit:0,lettre:"FF"},
  {id:65,date:"2025-01-10",account:"445660UBER",label:"TVA déduct. autoliq. comm. UBER sem.01",journal:"HA",piece:"FCU-2025-S01",debit:276.02,credit:0,lettre:""},
  {id:66,date:"2025-01-17",account:"445660UBER",label:"TVA déduct. autoliq. comm. UBER sem.02",journal:"HA",piece:"FCU-2025-S02",debit:267.20,credit:0,lettre:""},
  {id:67,date:"2025-01-13",account:"445660BOLT",label:"TVA déduct. autoliq. comm. BOLT sem.01",journal:"HA",piece:"FCB-2025-S01",debit:73.60,credit:0,lettre:""},
  {id:70,date:"2025-01-08",account:"6061DUPONT",label:"Carburant — TotalEnergies Villeurbanne",journal:"HA",piece:"NF-2025-D001",debit:85.40,credit:0,lettre:""},
  {id:71,date:"2025-01-15",account:"6061DUPONT",label:"Carburant — BP Part-Dieu",journal:"HA",piece:"NF-2025-D008",debit:72.60,credit:0,lettre:""},
  {id:72,date:"2025-01-22",account:"6061DUPONT",label:"Recharge électrique — Ionity",journal:"HA",piece:"NF-2025-D015",debit:45.20,credit:0,lettre:""},
  {id:73,date:"2025-01-09",account:"6061XAVIER",label:"Carburant — Esso Croix-Rousse",journal:"HA",piece:"NF-2025-X001",debit:68.90,credit:0,lettre:""},
  {id:74,date:"2025-01-20",account:"6061XAVIER",label:"Carburant — Shell Confluence",journal:"HA",piece:"NF-2025-X005",debit:91.30,credit:0,lettre:""},
  {id:75,date:"2025-01-01",account:"6135DUPONT",label:"Location mensuelle Peugeot e-208 — janv.",journal:"HA",piece:"NF-2025-D002",debit:580.00,credit:0,lettre:""},
  {id:76,date:"2025-01-18",account:"6152DUPONT",label:"Révision véhicule — garage Duval Lyon 3",journal:"HA",piece:"NF-2025-D012",debit:245.00,credit:0,lettre:""},
  {id:77,date:"2025-01-05",account:"6155DUPONT",label:"Forfait SFR Pro — janvier",journal:"HA",piece:"NF-2025-D003",debit:29.99,credit:0,lettre:""},
  {id:78,date:"2025-01-10",account:"6251DUPONT",label:"Péage A6 Lyon—Villefranche",journal:"HA",piece:"NF-2025-D005",debit:12.40,credit:0,lettre:""},
  {id:79,date:"2025-01-14",account:"6251DUPONT",label:"Péage A43 Lyon—Chambéry",journal:"HA",piece:"NF-2025-D007",debit:18.60,credit:0,lettre:""},
  {id:80,date:"2025-01-31",account:"4210DUPONT",label:"Salaire net janv. 2025 — DUPONT",journal:"OD",piece:"SAL-2025-D01",debit:0,credit:2450.00,lettre:"GG"},
  {id:81,date:"2025-02-05",account:"4210DUPONT",label:"Virement salaire janv. — DUPONT",journal:"BQ",piece:"VIR-2025-D01",debit:2450.00,credit:0,lettre:"GG"},
  {id:82,date:"2025-01-31",account:"4210XAVIER",label:"Salaire net janv. 2025 — XAVIER",journal:"OD",piece:"SAL-2025-X01",debit:0,credit:2180.00,lettre:""},
  {id:83,date:"2025-01-31",account:"4210KARIM",label:"Salaire net janv. 2025 — KARIM",journal:"OD",piece:"SAL-2025-K01",debit:0,credit:2620.00,lettre:""},
  {id:90,date:"2025-01-15",account:"512000",label:"Encaissement UBER sem.01",journal:"BQ",piece:"RG-2025-011",debit:4840.00,credit:0,lettre:""},
  {id:91,date:"2025-01-18",account:"512000",label:"Encaissement BOLT sem.01",journal:"BQ",piece:"RG-2025-031",debit:2280.00,credit:0,lettre:""},
  {id:92,date:"2025-01-20",account:"512000",label:"Décaissement comm. UBER sem.01",journal:"BQ",piece:"RG-2025-060",debit:0,credit:1380.10,lettre:""},
  {id:93,date:"2025-01-22",account:"512000",label:"Encaissement UBER sem.02",journal:"BQ",piece:"RG-2025-012",debit:5126.50,credit:0,lettre:""},
  {id:94,date:"2025-01-25",account:"512000",label:"Décaissement comm. BOLT sem.01",journal:"BQ",piece:"RG-2025-063",debit:0,credit:368.00,lettre:""},
  {id:95,date:"2025-02-05",account:"512000",label:"Virement salaire DUPONT janv.",journal:"BQ",piece:"VIR-2025-D01",debit:0,credit:2450.00,lettre:""},
];

const fmt = n => n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});

const BALANCE_TYPES = [
  { id:"generale", label:"BALANCE GÉNÉRALE", desc:"Tous les comptes — 401 et 411 centralisés, autres comptes en détail", filter: null, locked: true, levelSelector: true },
  { id:"simplifiee", label:"BALANCE SIMPLIFIÉE", desc:"Comptes centralisés à 3 chiffres — vue synthétique par comptes de regroupement", filter: null, locked: true, fixedLevel: 3 },
  { id:"clients", label:"BALANCE CLIENTS", desc:"Comptes 411 — Créances clients, lettrage et suivi des impayés", filter: a => a.startsWith("411"), locked: true },
  { id:"fournisseurs", label:"BALANCE FOURNISSEURS", desc:"Comptes 401 — Dettes fournisseurs, lettrage et suivi des règlements", filter: a => a.startsWith("401"), locked: true },
  { id:"partielle", label:"BALANCE PARTIELLE", desc:"Aucun compte chargé — ajoutez des comptes via la recherche pour construire votre balance personnalisée", filter: null, empty: true, locked: false },
];

export default function BalanceComptable() {
  const allAccounts = useMemo(() => [...new Set(ENTRIES.map(e=>e.account))].sort(), []);

  const [balanceType, setBalanceType] = useState("generale");
  const [collapsed, setCollapsed] = useState(new Set());
  const [checkedAccts, setCheckedAccts] = useState(() => new Set(allAccounts));
  // Comptes verrouillés (préchargés par le type de balance — non supprimables)
  const [lockedAccts, setLockedAccts] = useState(() => new Set(allAccounts));
  const [help, setHelp] = useState(false);
  const [expandedAcct, setExpandedAcct] = useState(null);
  const [sortCol, setSortCol] = useState("account");
  const [sortDir, setSortDir] = useState("asc");

  // Racines dynamiques — enrichies quand on ajoute un compte intermédiaire
  const [dynamicRoots, setDynamicRoots] = useState(() => {
    // Aplatir : racines de classe + toutes leurs sous-racines
    const roots = [];
    INITIAL_ROOTS.forEach(r => {
      roots.push({ number: r.number, name: r.name, cls: r.cls, children: r.children });
      if (r.subRoots) r.subRoots.forEach(sr => roots.push({ number: sr.number, name: sr.name, cls: sr.cls, children: sr.children }));
    });
    return roots;
  });

  // Niveau de centralisation
  const [centralLevel, setCentralLevel] = useState(null);

  const buildRootsForLevel = useCallback((level) => {
    if (!level) return [...INITIAL_ROOTS];
    var prefixes = new Map();
    allAccounts.forEach(function(a) {
      var prefix = a.substring(0, level);
      if (prefix.length === level) {
        if (!prefixes.has(prefix)) prefixes.set(prefix, []);
        prefixes.get(prefix).push(a);
      }
    });
    var roots = [];
    prefixes.forEach(function(children, prefix) {
      var name = ACCOUNT_NAMES[prefix] || ("Compte " + prefix);
      roots.push({ number: prefix, name: name, cls: prefix.charAt(0), children: children });
    });
    return roots.sort(function(a, b) { return a.number.localeCompare(b.number); });
  }, [allAccounts]);

  // Recherche autocomplete — ajouter un compte de détail
  const [searchInput, setSearchInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  // Recherche autocomplete — centraliser un compte racine
  const [centralInput, setCentralInput] = useState("");
  const [showCentralDropdown, setShowCentralDropdown] = useState(false);
  // Recherche multi-comptes dans la vue principale
  const [mainSearchInput, setMainSearchInput] = useState("");
  const [mainSearchTags, setMainSearchTags] = useState([]);
  const [showMainDropdown, setShowMainDropdown] = useState(false);

  // Plan comptable
  const PCG_ACCOUNTS = useMemo(() => ({
    "1":"COMPTES DE CAPITAUX","10":"Capital et réserves","101":"Capital social","106":"Réserves","1061":"Réserve légale",
    "12":"RÉSULTAT DE L'EXERCICE","120":"Résultat de l'exercice (bénéfice)","129":"Résultat de l'exercice (perte)",
    "2":"COMPTES D'IMMOBILISATIONS","20":"Immobilisations incorporelles","21":"Immobilisations corporelles",
    "218":"Autres immobilisations corporelles","2182":"Matériel de transport","2183":"Matériel de bureau et informatique",
    "28":"Amortissements des immobilisations","280":"Amort. immobilisations incorporelles",
    "3":"COMPTES DE STOCKS ET D'EN-COURS","31":"Stocks de matières premières","310":"Stocks de matières premières",
    "4":"COMPTES DE TIERS","40":"Fournisseurs et comptes rattachés","401":"Fournisseurs","4010":"Fournisseurs — achats",
    "41":"Clients et comptes rattachés","411":"Clients","4110":"Clients — ventes",
    "42":"Personnel et comptes rattachés","421":"Rémunérations dues",
    "44":"État et autres collectivités","445":"TVA","4456":"TVA déductible","4457":"TVA collectée",
    "5":"COMPTES FINANCIERS","51":"Banques et établissements financiers","512":"Banques",
    "6":"COMPTES DE CHARGES","60":"Achats","606":"Achats non stockés","6061":"Fournitures non stockables (carburant)",
    "61":"Services extérieurs","613":"Locations","6135":"Locations mobilières",
    "615":"Entretien et réparations","6152":"Entretien sur biens immobiliers","6155":"Maintenance (téléphonie)",
    "62":"Autres services extérieurs","622":"Commissions","6226":"Honoraires et commissions",
    "625":"Déplacements et missions","6251":"Voyages et déplacements",
    "68":"Dotations aux amortissements","681":"Dotations amortissements corporels","6811":"Dotations amort. immob. corporelles",
    "7":"COMPTES DE PRODUITS","70":"Ventes","706":"Prestations de services","7061":"Ventes prestations — catégorie A","7062":"Ventes prestations — catégorie B","7063":"Ventes prestations — catégorie C",
    "8":"COMPTES SPÉCIAUX",
  }), []);

  const allAvailableAccounts = useMemo(() => {
    const list = [];
    Object.entries(PCG_ACCOUNTS).forEach(([num, name]) => {
      const isRoot = dynamicRoots.some(r => r.number === num);
      const isDetail = ACCOUNT_NAMES.hasOwnProperty(num);
      list.push({ number: num, name, type: isRoot ? "racine" : isDetail ? "detail" : "intermédiaire" });
    });
    Object.entries(ACCOUNT_NAMES).forEach(([num, name]) => {
      if (!list.some(l => l.number === num)) list.push({ number: num, name, type: "detail" });
    });
    return list.sort((a, b) => a.number.localeCompare(b.number));
  }, [PCG_ACCOUNTS, dynamicRoots]);

  // Suggestions "Ajouter un compte" — détail + racines + intermédiaires
  const suggestions = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.toUpperCase();
    return allAvailableAccounts.filter(a =>
      a.number.toUpperCase().startsWith(q) || a.name.toUpperCase().includes(q)
    ).slice(0, 10);
  }, [searchInput, allAvailableAccounts]);

  // Suggestions "Centraliser" — uniquement intermédiaires/racines
  const centralSuggestions = useMemo(() => {
    if (!centralInput.trim()) return [];
    const q = centralInput.toUpperCase();
    return allAvailableAccounts.filter(a => a.type !== "detail" &&
      (a.number.toUpperCase().startsWith(q) || a.name.toUpperCase().includes(q))
    ).slice(0, 10);
  }, [centralInput, allAvailableAccounts]);

  // Handler — ajouter un compte (détail ou racine)
  const handleAddAccount = useCallback((acct) => {
    const children = allAccounts.filter(a => a.startsWith(acct.number) && a !== acct.number);
    // Si c'est un compte avec des enfants, créer une racine dynamique (sans centraliser)
    if (children.length > 0 && acct.type !== "detail") {
      setDynamicRoots(prev => {
        if (prev.find(r => r.number === acct.number)) return prev;
        return [...prev, { number: acct.number, name: acct.name, cls: acct.number.charAt(0), children }];
      });
    }
    setCheckedAccts(p => { const n = new Set(p); n.add(acct.number); children.forEach(c => n.add(c)); return n; });
    setSearchInput("");
    setShowDropdown(false);
    setPage(0);
  }, [allAccounts]);

  // Handler — centraliser un compte racine
  const handleCentralize = useCallback((acct) => {
    const children = allAccounts.filter(a => a.startsWith(acct.number) && a !== acct.number);
    if (children.length > 0) {
      setDynamicRoots(prev => {
        if (prev.find(r => r.number === acct.number)) return prev;
        return [...prev, { number: acct.number, name: acct.name, cls: acct.number.charAt(0), children }];
      });
      setCentralizedRoots(p => { const n = new Set(p); n.add(acct.number); return n; });
    }
    setCheckedAccts(p => { const n = new Set(p); n.add(acct.number); children.forEach(c => n.add(c)); return n; });
    setCentralInput("");
    setShowCentralDropdown(false);
    setPage(0);
  }, [allAccounts]);

  // Handler — supprimer un compte de détail (uniquement si non verrouillé)
  const handleRemoveAccount = useCallback((acctNumber) => {
    if (lockedAccts.has(acctNumber)) return;
    setCheckedAccts(p => { const n = new Set(p); n.delete(acctNumber); return n; });
    setPage(0);
  }, [lockedAccts]);

  // Handler — supprimer une racine dynamique et ses enfants
  const handleRemoveRoot = useCallback((rootNumber) => {
    const isInitial = INITIAL_ROOTS.some(r => r.number === rootNumber);
    const isLocked = BALANCE_TYPES.find(t => t.id === balanceType)?.locked;
    if (isInitial && isLocked) return;
    const root = dynamicRoots.find(r => r.number === rootNumber);
    setDynamicRoots(prev => prev.filter(r => r.number !== rootNumber));
    setCentralizedRoots(p => { const n = new Set(p); n.delete(rootNumber); return n; });
    if (root) {
      setCheckedAccts(p => {
        const n = new Set(p);
        if (!lockedAccts.has(rootNumber)) n.delete(rootNumber);
        root.children.forEach(c => { if (!lockedAccts.has(c)) n.delete(c); });
        return n;
      });
    }
    setPage(0);
  }, [dynamicRoots, lockedAccts, balanceType]);

  // Pagination — miroir du grand livre
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  // Centralisation activable/désactivable par racine — miroir du grand livre
  const [centralizedRoots, setCentralizedRoots] = useState(() => new Set(CENTRALIZED_ROOTS));
  // Affichage comptes de détail dans la sidebar (visuel uniquement)
  const [showDetail, setShowDetail] = useState(true);
  // Détection scroll sidebar pour ombre dynamique
  const [sidebarScrolled, setSidebarScrolled] = useState(false);
  // Filtre de période — par défaut sur l'exercice courant
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-12-31");
  // Sélecteur de mois — plage continue (1er clic = début, 2e clic = fin)
  const [monthClickPhase, setMonthClickPhase] = useState(0); // 0 = prochain clic = début, 1 = prochain clic = fin
  const [monthFirstClick, setMonthFirstClick] = useState(0); // index du 1er mois cliqué

  const MONTHS = [
    {l:"Janv.",from:"2025-01-01",to:"2025-01-31",idx:0},
    {l:"Fév.",from:"2025-02-01",to:"2025-02-28",idx:1},
    {l:"Mars",from:"2025-03-01",to:"2025-03-31",idx:2},
    {l:"Avr.",from:"2025-04-01",to:"2025-04-30",idx:3},
    {l:"Mai",from:"2025-05-01",to:"2025-05-31",idx:4},
    {l:"Juin",from:"2025-06-01",to:"2025-06-30",idx:5},
    {l:"Juil.",from:"2025-07-01",to:"2025-07-31",idx:6},
    {l:"Août",from:"2025-08-01",to:"2025-08-31",idx:7},
    {l:"Sept.",from:"2025-09-01",to:"2025-09-30",idx:8},
    {l:"Oct.",from:"2025-10-01",to:"2025-10-31",idx:9},
    {l:"Nov.",from:"2025-11-01",to:"2025-11-30",idx:10},
    {l:"Déc.",from:"2025-12-01",to:"2025-12-31",idx:11},
  ];

  // Calculer les index de mois sélectionnés à partir de dateFrom/dateTo
  const selMonthStart = MONTHS.findIndex(m => m.from === dateFrom);
  const selMonthEnd = MONTHS.findIndex(m => m.to === dateTo);

  const handleMonthClick = (idx) => {
    if (monthClickPhase === 0) {
      // 1er clic : sélectionne un seul mois, attend le 2e
      setDateFrom(MONTHS[idx].from);
      setDateTo(MONTHS[idx].to);
      setMonthFirstClick(idx);
      setMonthClickPhase(1);
      setPage(0);
    } else {
      // 2e clic : étend la plage du 1er au 2e
      const s = Math.min(monthFirstClick, idx);
      const e = Math.max(monthFirstClick, idx);
      setDateFrom(MONTHS[s].from);
      setDateTo(MONTHS[e].to);
      setMonthClickPhase(0);
      setPage(0);
    }
  };
  // Affichage colonnes Total Débit / Total Crédit
  const [showTotals, setShowTotals] = useState(false);
  // Affichage solde : true = 2 colonnes (Solde D + Solde C), false = 1 colonne (Solde avec suffixe D/C)
  const [splitSolde, setSplitSolde] = useState(false);
  // Affichage ventilation mensuelle
  const [showMonthly, setShowMonthly] = useState(false);
  // Comparatif N-1
  const [showCompare, setShowCompare] = useState(false);

  // Les options Total D/C et Solde D/C séparés sont désactivées quand mensuel OU comparatif est actif
  const disableBasicOptions = showMonthly || showCompare;

  const bt = BALANCE_TYPES.find(t => t.id === balanceType);
  const isTiers = bt.id === "clients" || bt.id === "fournisseurs";

  const accounts = useMemo(() => {
    if (bt.empty) {
      // Balance partielle : tous les comptes de détail (avec écritures) qui sont cochés
      // OU qui sont enfants d'une racine dynamique cochée
      const result = new Set();
      // 1. Ajouter les comptes cochés qui ont des écritures
      allAccounts.forEach(a => { if (checkedAccts.has(a)) result.add(a); });
      // 2. Pour chaque racine dynamique, si elle est cochée, ajouter ses enfants
      dynamicRoots.forEach(r => {
        if (checkedAccts.has(r.number)) {
          r.children.forEach(c => result.add(c));
        }
      });
      return [...result].sort();
    }
    let accts = [...allAccounts];
    if (bt.filter) accts = accts.filter(bt.filter);
    return accts;
  }, [allAccounts, bt, checkedAccts, dynamicRoots]);

  const toggleCheck = useCallback((acct) => {
    setCheckedAccts(p => { const n = new Set(p); if (n.has(acct)) n.delete(acct); else n.add(acct); return n; });
    setPage(0);
  }, []);

  const toggleClassSelect = useCallback((cls) => {
    const clsAccts = accounts.filter(a => a.charAt(0) === cls);
    const allChecked = clsAccts.every(a => checkedAccts.has(a));
    setCheckedAccts(p => { const n = new Set(p); clsAccts.forEach(c => { if (allChecked) n.delete(c); else n.add(c); }); return n; });
    setPage(0);
  }, [accounts, checkedAccts]);

  // ── Calcul balance par compte (filtré par période) ──
  const balanceRows = useMemo(() => {
    const visibleAccts = accounts.filter(a => checkedAccts.has(a));
    return visibleAccts.map(acct => {
      let es = ENTRIES.filter(e => e.account === acct);
      // Filtre période
      if (dateFrom) es = es.filter(e => e.date >= dateFrom);
      if (dateTo) es = es.filter(e => e.date <= dateTo);
      const totalD = es.reduce((s,e) => s + e.debit, 0);
      const totalC = es.reduce((s,e) => s + e.credit, 0);
      const solde = totalD - totalC;
      const nbLettrees = es.filter(e => !!e.lettre).length;
      const nbNonLettrees = es.filter(e => !e.lettre).length;
      const esNL = es.filter(e => !e.lettre).sort((a,b)=>a.date.localeCompare(b.date));
      // Soldes par mois (01 à 12)
      const monthly = {};
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2,"0");
        const mEs = es.filter(e => e.date.substring(5,7) === mm);
        const mD = mEs.reduce((s,e)=>s+e.debit,0);
        const mC = mEs.reduce((s,e)=>s+e.credit,0);
        monthly[mm] = mD - mC;
      }
      return {
        account: acct, name: ACCOUNT_NAMES[acct] || acct, cls: acct.charAt(0),
        totalD, totalC, solde,
        soldeD: solde > 0 ? solde : 0, soldeC: solde < 0 ? Math.abs(solde) : 0,
        nbEcritures: es.length, nbLettrees, nbNonLettrees,
        soldeNL: esNL.reduce((s,e)=>s+e.debit,0) - esNL.reduce((s,e)=>s+e.credit,0),
        soldeNL_D: esNL.reduce((s,e)=>s+e.debit,0),
        soldeNL_C: esNL.reduce((s,e)=>s+e.credit,0),
        detailNL: esNL,
        monthly,
      };
    });
  }, [accounts, checkedAccts, dateFrom, dateTo]);

  // ── Lignes affichées : centraliser selon centralizedRoots (activable/désactivable) ──
  const displayRows = useMemo(() => {
    if (isTiers) return balanceRows;
    const activeCentralized = [...centralizedRoots];
    if (activeCentralized.length === 0) return balanceRows; // aucune centralisation
    const centralizedAccts = new Set();
    const centralizedEntries = {};
    activeCentralized.forEach(rNum => {
      const root = dynamicRoots.find(r => r.number === rNum);
      if (!root) return;
      const activeChildren = root.children.filter(c => balanceRows.some(b => b.account === c));
      if (activeChildren.length === 0) return;
      activeChildren.forEach(c => centralizedAccts.add(c));
      const allEs = ENTRIES.filter(e => activeChildren.includes(e.account));
      const totalD = allEs.reduce((s,e)=>s+e.debit,0);
      const totalC = allEs.reduce((s,e)=>s+e.credit,0);
      const solde = totalD - totalC;
      const esNL = allEs.filter(e => !e.lettre);
      // Soldes mensuels agrégés pour les comptes centralisés
      const monthly = {};
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2,"0");
        let filtEs = allEs;
        if (dateFrom) filtEs = filtEs.filter(e => e.date >= dateFrom);
        if (dateTo) filtEs = filtEs.filter(e => e.date <= dateTo);
        const mEs = filtEs.filter(e => e.date.substring(5,7) === mm);
        monthly[mm] = mEs.reduce((s,e)=>s+e.debit,0) - mEs.reduce((s,e)=>s+e.credit,0);
      }
      centralizedEntries[rNum] = {
        account: rNum, name: root.name + " (centralisé)", cls: root.cls,
        totalD, totalC, solde,
        soldeD: solde > 0 ? solde : 0, soldeC: solde < 0 ? Math.abs(solde) : 0,
        nbEcritures: allEs.length,
        nbLettrees: allEs.filter(e=>!!e.lettre).length,
        nbNonLettrees: esNL.length,
        soldeNL: esNL.reduce((s,e)=>s+e.debit,0) - esNL.reduce((s,e)=>s+e.credit,0),
        soldeNL_D: esNL.reduce((s,e)=>s+e.debit,0),
        soldeNL_C: esNL.reduce((s,e)=>s+e.credit,0),
        detailNL: esNL.sort((a,b)=>a.date.localeCompare(b.date)),
        isCentralized: true,
        childrenRows: activeChildren.map(c => balanceRows.find(b => b.account === c)).filter(Boolean),
        monthly,
      };
    });
    const result = [];
    const shownCentralized = new Set();
    balanceRows.forEach(row => {
      if (centralizedAccts.has(row.account)) {
        const parentRoot = dynamicRoots.find(r => activeCentralized.includes(r.number) && r.children.includes(row.account));
        if (parentRoot && !shownCentralized.has(parentRoot.number)) {
          shownCentralized.add(parentRoot.number);
          result.push(centralizedEntries[parentRoot.number]);
        }
      } else {
        result.push(row);
      }
    });
    return result;
  }, [balanceRows, isTiers, centralizedRoots]);

  // ── Tri ──
  const sortedRows = useMemo(() => {
    const d = [...displayRows];
    d.sort((a, b) => {
      let va, vb;
      switch(sortCol) {
        case "account": va=a.account; vb=b.account; break;
        case "name": va=a.name; vb=b.name; break;
        case "totalD": va=a.totalD; vb=b.totalD; break;
        case "totalC": va=a.totalC; vb=b.totalC; break;
        case "soldeD": va=a.soldeD; vb=b.soldeD; break;
        case "soldeC": va=a.soldeC; vb=b.soldeC; break;
        case "soldeNL": va=Math.abs(a.soldeNL||0); vb=Math.abs(b.soldeNL||0); break;
        default: va=a.account; vb=b.account;
      }
      if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === "asc" ? va - vb : vb - va;
    });
    return d;
  }, [displayRows, sortCol, sortDir]);

  // Suggestions recherche principale — comptes déjà dans la balance
  const mainSuggestions = useMemo(() => {
    if (!mainSearchInput.trim()) return [];
    const q = mainSearchInput.toUpperCase();
    return sortedRows.filter(r =>
      !mainSearchTags.includes(r.account) &&
      (r.account.toUpperCase().startsWith(q) || r.name.toUpperCase().includes(q))
    ).slice(0, 8);
  }, [mainSearchInput, sortedRows, mainSearchTags]);

  const handleAddMainTag = useCallback((acct) => {
    setMainSearchTags(prev => [...prev, acct]);
    setMainSearchInput("");
    setShowMainDropdown(false);
    setPage(0);
  }, []);

  const handleRemoveMainTag = useCallback((acct) => {
    setMainSearchTags(prev => prev.filter(t => t !== acct));
    setPage(0);
  }, []);

  // ── Filtrage par recherche principale ──
  const filteredRows = useMemo(() => {
    if (mainSearchTags.length === 0) return sortedRows;
    return sortedRows.filter(r => mainSearchTags.includes(r.account));
  }, [sortedRows, mainSearchTags]);

  // ── Totaux (sur les lignes filtrées) ──
  const totals = useMemo(() => {
    const d = filteredRows.reduce((s,r) => s + r.totalD, 0);
    const c = filteredRows.reduce((s,r) => s + r.totalC, 0);
    const sd = filteredRows.reduce((s,r) => s + r.soldeD, 0);
    const sc = filteredRows.reduce((s,r) => s + r.soldeC, 0);
    const nbNL = filteredRows.reduce((s,r) => s + r.nbNonLettrees, 0);
    const nbL = filteredRows.reduce((s,r) => s + r.nbLettrees, 0);
    return { d, c, sd, sc, diff: Math.abs(sd - sc), nbAccts: filteredRows.length, nbNL, nbL };
  }, [filteredRows]);

  // ── Pagination ──
  const totalPages = Math.ceil(filteredRows.length / perPage);
  const pagedRows = filteredRows.slice(page * perPage, (page + 1) * perPage);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
    setPage(0);
  };
  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";
  const numTd = { padding:"7px 10px", textAlign:"right", fontVariantNumeric:"tabular-nums", fontSize:11 };
  const thStyle = (col, align="right") => ({
    padding:"9px 10px", textAlign:align, fontSize:9, fontWeight:700, letterSpacing:0.7, textTransform:"uppercase",
    color: sortCol===col ? "#c9a227" : "#a8a29e", borderBottom:"2px solid #d6d0c4", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none",
  });

  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f0ede6",height:"100vh",color:"#1c1917",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:"#1c1917",color:"#faf9f6",padding:"14px 22px",borderBottom:"3px solid #c9a227",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:7,background:"linear-gradient(135deg,#c9a227,#e8d48b)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#1c1917"}}>SU</div>
          <div>
            <div style={{fontSize:14,fontWeight:700}}>Balance Comptable</div>
            <div style={{fontSize:10,color:"#a8a29e",marginTop:1}}>Stairling Union · Exercice 2025 · {bt.label}</div>
          </div>
        </div>
        <button onClick={()=>setHelp(!help)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,padding:"4px 11px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{help?"✕":"? Aide"}</button>
      </div>

      {help && <div style={{background:"#fffbeb",border:"1px solid #f9e79f",margin:"10px 14px 0",borderRadius:7,padding:"10px 14px",fontSize:11,lineHeight:1.6}}>
        <strong>Balance générale :</strong> les comptes 401 (Fournisseurs) et 411 (Clients) sont centralisés en une seule ligne. Les autres comptes apparaissent en détail. Cochez/décochez dans la sidebar pour inclure/exclure.<br/>
        <strong>Balance clients/fournisseurs :</strong> chaque sous-compte est affiché, cliquez pour voir les écritures non lettrées.<br/>
        <strong>Tri :</strong> cliquez sur un en-tête de colonne.
      </div>}

      <div style={{display:"flex",flex:1,minHeight:0}}>

        {/* ══════════ SIDEBAR ══════════ */}
        <div style={{width:270,minWidth:270,background:"#faf9f6",borderRight:"1px solid #d6d0c4",display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden"}}>

          {/* ── ZONE FIXE HAUTE ── */}
          <div style={{flexShrink:0,background:"#faf9f6",zIndex:2,
            borderBottom:sidebarScrolled?"1px solid #d6d0c4":"1px solid #e8e4db",
            boxShadow:sidebarScrolled?"0 4px 12px rgba(0,0,0,0.08)":"none",
            transition:"box-shadow 0.2s, border-color 0.2s"}}>
            <div style={{padding:"10px 12px 4px"}}>
              <select value={balanceType} onChange={e=>{
                const newType = e.target.value;
                setBalanceType(newType); setSearchInput(""); setCollapsed(new Set()); setSortCol("account"); setSortDir("asc"); setExpandedAcct(null); setPage(0);
                setCentralizedRoots(new Set(CENTRALIZED_ROOTS));
                setDateFrom("2025-01-01"); setDateTo("2025-12-31");
                const lt = BALANCE_TYPES.find(t=>t.id===newType);
                if (lt && lt.empty) {
                  setCheckedAccts(new Set());
                  setLockedAccts(new Set());
                  setDynamicRoots([]);
                  setCentralLevel(null);
                  setCentralizedRoots(new Set());
                } else if (lt && lt.fixedLevel) {
                  var roots = buildRootsForLevel(lt.fixedLevel);
                  setCheckedAccts(new Set(allAccounts));
                  setLockedAccts(new Set(allAccounts));
                  setDynamicRoots(roots);
                  setCentralLevel(lt.fixedLevel);
                  setCentralizedRoots(new Set(roots.map(function(r){return r.number})));
                } else if (lt && lt.filter) {
                  var filtered = allAccounts.filter(lt.filter);
                  setCheckedAccts(new Set(filtered));
                  setLockedAccts(new Set(filtered));
                  setDynamicRoots((() => {
                  const roots = [];
                  INITIAL_ROOTS.forEach(function(r) {
                    roots.push({ number: r.number, name: r.name, cls: r.cls, children: r.children });
                    if (r.subRoots) r.subRoots.forEach(function(sr) { roots.push({ number: sr.number, name: sr.name, cls: sr.cls, children: sr.children }); });
                  });
                  return roots;
                })());
                  setCentralLevel(null);
                  setCentralizedRoots(new Set(CENTRALIZED_ROOTS));
                } else {
                  setCheckedAccts(new Set(allAccounts));
                  setLockedAccts(new Set(allAccounts));
                  setDynamicRoots((() => {
                  const roots = [];
                  INITIAL_ROOTS.forEach(function(r) {
                    roots.push({ number: r.number, name: r.name, cls: r.cls, children: r.children });
                    if (r.subRoots) r.subRoots.forEach(function(sr) { roots.push({ number: sr.number, name: sr.name, cls: sr.cls, children: sr.children }); });
                  });
                  return roots;
                })());
                  setCentralLevel(null);
                  setCentralizedRoots(new Set(CENTRALIZED_ROOTS));
                }
              }}
                style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #c9a227",fontSize:11,fontWeight:700,fontFamily:"inherit",background:"#fff",color:"#1c1917",cursor:"pointer",boxSizing:"border-box",marginBottom:8}}>
                {BALANCE_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <div style={{fontSize:9,color:"#a8a29e",marginBottom:6,padding:"0 2px",lineHeight:1.3}}>{bt.desc}</div>
              {(bt.levelSelector || bt.fixedLevel) && (
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",marginBottom:8,borderRadius:5,
                  border:"1px solid " + (centralLevel ? "#c9a227" : "#d6d0c4"),background:centralLevel?"#c9a22708":"transparent"}}>
                  <span style={{fontSize:10,fontWeight:600,color:centralLevel?"#1c1917":"#a8a29e"}}>Niveau de centralisation</span>
                  <select value={centralLevel || ""}
                    disabled={!!bt.fixedLevel}
                    onChange={function(e){
                      var val = e.target.value ? parseInt(e.target.value) : null;
                      setCentralLevel(val);
                      if (val) {
                        var roots = buildRootsForLevel(val);
                        setDynamicRoots(roots);
                        setCentralizedRoots(new Set(roots.map(function(r){return r.number})));
                      } else {
                        setDynamicRoots((() => {
                  const roots = [];
                  INITIAL_ROOTS.forEach(function(r) {
                    roots.push({ number: r.number, name: r.name, cls: r.cls, children: r.children });
                    if (r.subRoots) r.subRoots.forEach(function(sr) { roots.push({ number: sr.number, name: sr.name, cls: sr.cls, children: sr.children }); });
                  });
                  return roots;
                })());
                        setCentralizedRoots(new Set(CENTRALIZED_ROOTS));
                      }
                      setPage(0);
                      setExpandedAcct(null);
                    }}
                    style={{padding:"3px 6px",borderRadius:4,border:"1px solid #d6d0c4",fontSize:10,fontFamily:"inherit",
                      background:bt.fixedLevel?"#f5f3ee":"#fff",color:bt.fixedLevel?"#a8a29e":"#1c1917",
                      cursor:bt.fixedLevel?"not-allowed":"pointer"}}>
                    <option value="">Détail (pas de niveau)</option>
                    <option value="1">1 chiffre (classes)</option>
                    <option value="2">2 chiffres</option>
                    <option value="3">3 chiffres</option>
                  </select>
                </div>
              )}
              {/* Toggle affichage comptes de détail */}
              <div onClick={()=>setShowDetail(d=>!d)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",marginBottom:8,borderRadius:5,
                  border:`1px solid ${showDetail?"#c9a227":"#d6d0c4"}`,background:showDetail?"#c9a22708":"transparent",cursor:"pointer",transition:"all 0.15s"}}>
                <span style={{fontSize:10,fontWeight:600,color:showDetail?"#1c1917":"#a8a29e"}}>Afficher comptes détaillés</span>
                <div style={{width:30,height:16,borderRadius:8,background:showDetail?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                  <div style={{width:12,height:12,borderRadius:6,background:"#fff",position:"absolute",top:2,left:showDetail?16:2,transition:"left 0.2s"}}/>
                </div>
              </div>
              {/* Champ 1 — Ajouter un compte (verrouillé si balance locked) */}
              {!bt.locked ? (
              <div style={{position:"relative",marginBottom:6}}>
                <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,color:"#78716c",marginBottom:3}}>Ajouter un compte</div>
                <input type="text" placeholder="Ex : 101000, 512000…" value={searchInput}
                  onChange={e=>{setSearchInput(e.target.value);setShowDropdown(true);}}
                  onFocus={()=>{if(searchInput.trim())setShowDropdown(true);}}
                  onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}
                  style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1.5px solid ${searchInput?"#16a34a":"#d6d0c4"}`,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
                {showDropdown && suggestions.length > 0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                    border:"1.5px solid #16a34a",boxShadow:"0 6px 16px rgba(0,0,0,0.12)",maxHeight:200,overflowY:"auto"}}>
                    {suggestions.map(s => (
                      <div key={s.number} onMouseDown={()=>handleAddAccount(s)}
                        style={{padding:"6px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
                          borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f0fdf4"}
                        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <div>
                          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:getAC(s.number).color,marginRight:6}}>{s.number}</span>
                          <span style={{fontSize:10,color:"#57534e"}}>{s.name}</span>
                        </div>
                        <span style={{fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,
                          background:s.type==="racine"?"#c9a22720":s.type==="intermédiaire"?"#2563eb15":"#dcfce7",
                          color:s.type==="racine"?"#8b6914":s.type==="intermédiaire"?"#2563eb":"#16a34a"}}>{s.type==="racine"?"Racine":s.type==="intermédiaire"?"Compte":"Détail"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && searchInput.trim() && suggestions.length === 0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                    border:"1.5px solid #d6d0c4",boxShadow:"0 6px 16px rgba(0,0,0,0.08)",padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"#a8a29e",fontStyle:"italic"}}>Aucun compte de détail pour "{searchInput}"</div>
                  </div>
                )}
              </div>
              ) : (
                <div style={{padding:"5px 8px",borderRadius:5,background:"#f5f3ee",border:"1px solid #e8e4db",marginBottom:6,
                  display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:10}}>🔒</span>
                  <span style={{fontSize:9,color:"#a8a29e"}}>Ajout de comptes verrouillé</span>
                </div>
              )}
              {/* Champ 2 — Centraliser un compte (verrouillé si niveau de centralisation actif) */}
              {centralLevel ? (
                <div style={{padding:"5px 8px",borderRadius:5,background:"#f5f3ee",border:"1px solid #e8e4db",
                  display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:10}}>🔒</span>
                  <span style={{fontSize:9,color:"#a8a29e"}}>Centralisation gérée par le niveau ({centralLevel} chiffre{centralLevel > 1 ? "s" : ""})</span>
                </div>
              ) : (
              <div style={{position:"relative"}}>
                <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,color:"#78716c",marginBottom:3}}>Centraliser un compte</div>
                <input type="text" placeholder="Ex : 1, 218, 401…" value={centralInput}
                  onChange={e=>{setCentralInput(e.target.value);setShowCentralDropdown(true);}}
                  onFocus={()=>{if(centralInput.trim())setShowCentralDropdown(true);}}
                  onBlur={()=>setTimeout(()=>setShowCentralDropdown(false),200)}
                  style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1.5px solid ${centralInput?"#c9a227":"#d6d0c4"}`,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
                {showCentralDropdown && centralSuggestions.length > 0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                    border:"1.5px solid #c9a227",boxShadow:"0 6px 16px rgba(0,0,0,0.12)",maxHeight:200,overflowY:"auto"}}>
                    {centralSuggestions.map(s => {
                      const nbChildren = allAccounts.filter(a => a.startsWith(s.number) && a !== s.number).length;
                      return (
                        <div key={s.number} onMouseDown={()=>handleCentralize(s)}
                          style={{padding:"6px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
                            borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#faf8f0"}
                          onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                          <div>
                            <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:getAC(s.number).color,marginRight:6}}>{s.number}</span>
                            <span style={{fontSize:10,color:"#57534e"}}>{s.name}</span>
                          </div>
                          <span style={{fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,background:"#c9a22720",color:"#8b6914"}}>
                            Racine · {nbChildren} cpte{nbChildren>1?"s":""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {showCentralDropdown && centralInput.trim() && centralSuggestions.length === 0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                    border:"1.5px solid #d6d0c4",boxShadow:"0 6px 16px rgba(0,0,0,0.08)",padding:"8px 12px"}}>
                    <div style={{fontSize:10,color:"#a8a29e",fontStyle:"italic"}}>Aucun compte racine pour "{centralInput}"</div>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Compteur + boutons */}
            <div style={{padding:"4px 12px 6px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}>
              <span style={{fontSize:9,color:"#78716c",fontWeight:600}}>{[...checkedAccts].filter(a => accounts.includes(a)).length} / {accounts.length}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{
                  const allKeys = new Set();
                  if (!isTiers) { [...new Set(accounts.map(a=>a.charAt(0)))].forEach(cls => allKeys.add(`cls_${cls}`)); }
                  else { dynamicRoots.forEach(r => { if (r.children.some(c => accounts.includes(c))) allKeys.add(r.number); }); }
                  setCollapsed(p => { const allExp = [...allKeys].every(k => !p.has(k)); return allExp ? new Set(allKeys) : new Set(); });
                }} style={{fontSize:9,color:"#0891b2",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>
                  {(()=>{
                    const allKeys = [];
                    if (!isTiers) { [...new Set(accounts.map(a=>a.charAt(0)))].forEach(cls => allKeys.push(`cls_${cls}`)); }
                    else { dynamicRoots.forEach(r => { if (r.children.some(c => accounts.includes(c))) allKeys.push(r.number); }); }
                    return allKeys.every(k => !collapsed.has(k)) ? "▶ Replier" : "▼ Déplier";
                  })()}
                </button>
                {[...checkedAccts].filter(a=>accounts.includes(a)).length < accounts.length && (
                  <button onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);accounts.forEach(a=>n.add(a));return n;});setPage(0);}}
                    style={{fontSize:9,color:"#16a34a",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>Tout cocher</button>
                )}
                {[...checkedAccts].filter(a=>accounts.includes(a)).length > 0 && (
                  <button onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);accounts.forEach(a=>n.delete(a));return n;});setPage(0);}}
                    style={{fontSize:9,color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>Tout décocher</button>
                )}
              </div>
            </div>
          </div>

          {/* ── ZONE SCROLLABLE — Arbre comptes ── */}
          <div onScroll={e => setSidebarScrolled(e.target.scrollTop > 0)}
            style={{flex:1,overflowY:"auto",padding:"0 5px 10px"}}>
            {bt.empty && accounts.length === 0 ? (
              <div style={{padding:"20px 12px",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:8}}>📋</div>
                <div style={{fontSize:11,fontWeight:600,color:"#78716c",marginBottom:4}}>Aucun compte chargé</div>
                <div style={{fontSize:10,color:"#a8a29e",lineHeight:1.4}}>Utilisez le champ ci-dessus pour rechercher et ajouter des comptes depuis le plan comptable.</div>
              </div>
            ) : (
            (()=>{
              if (isTiers) {
                const rootGroups = [];
                dynamicRoots.forEach(r => {
                  const children = r.children.filter(c => accounts.includes(c));
                  if (children.length > 0) rootGroups.push({ ...r, visibleChildren: children });
                });
                return rootGroups.map(r => {
                  const clr = (ACCOUNT_CLASSES[r.cls]||{color:"#78716c"}).color;
                  const isCol = collapsed.has(r.number);
                  const rChecked = r.visibleChildren.filter(a => checkedAccts.has(a)).length;
                  const allRChecked = rChecked === r.visibleChildren.length;
                  return (
                    <div key={r.number} style={{marginBottom:2}}>
                      <div style={{padding:"6px 9px",display:"flex",alignItems:"center",gap:5,borderRadius:5,fontSize:10,fontWeight:700,
                        color:clr,background:allRChecked?`${clr}15`:`${clr}08`,userSelect:"none",
                        borderLeft:allRChecked?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.12s"}}>
                        <span onClick={()=>{setCollapsed(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;})}}
                          style={{fontSize:8,transition:"transform 0.15s",transform:isCol?"rotate(-90deg)":"rotate(0)",cursor:"pointer",padding:"2px"}}>▼</span>
                        <span onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);r.visibleChildren.forEach(c=>{if(allRChecked)n.delete(c);else n.add(c);});return n;});setPage(0);}} style={{cursor:"pointer",flex:1}}>
                          <span style={{fontFamily:"monospace",fontWeight:800,marginRight:5}}>{r.number}</span>{r.name}
                        </span>
                        <span style={{fontSize:9,opacity:0.6}}>{rChecked>0&&<span style={{color:clr,fontWeight:800}}>{rChecked}/</span>}{r.visibleChildren.length}</span>
                      </div>
                      {!isCol && showDetail && r.visibleChildren.map(a => {
                        const active = checkedAccts.has(a);
                        const locked = lockedAccts.has(a);
                        const um = ENTRIES.filter(e=>e.account===a&&!e.lettre).length;
                        return (
                          <div key={a} onClick={()=>toggleCheck(a)}
                            style={{padding:"5px 9px 5px 24px",cursor:"pointer",borderRadius:3,marginTop:1,
                              background:active?`${clr}12`:"transparent",borderLeft:active?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.1s"}}
                            onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}}
                            onMouseLeave={e=>{e.currentTarget.style.background=active?`${clr}12`:"transparent"}}>
                            <div style={{fontSize:11,fontWeight:active?700:500,color:active?clr:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                              <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                              <span style={{display:"flex",gap:3,alignItems:"center"}}>
                                {locked&&<span style={{fontSize:8,color:"#a8a29e"}} title="Compte verrouillé">🔒</span>}
                                {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                              </span>
                            </div>
                            <div style={{fontSize:9,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              }

              // Mode global : racines de classe > sous-racines > comptes
              // En balance partielle : toutes les racines cochées sont affichées
              // En balance normale : seulement les racines de classe (1 chiffre)
              const visibleClassRoots = bt.empty
                ? dynamicRoots.filter(r => checkedAccts.has(r.number) || r.children.some(c => checkedAccts.has(c)))
                    .filter(r => accounts.some(a => a.startsWith(r.number)))
                    .sort((a,b) => a.number.localeCompare(b.number))
                : dynamicRoots.filter(r =>
                    r.number.length === 1 && accounts.some(a => a.charAt(0) === r.number)
                  ).sort((a,b) => a.number.localeCompare(b.number));

              // Fonction de rendu d'un compte de détail
              const renderDetail = (a, color, indent, isCent) => {
                const active = checkedAccts.has(a);
                const locked = lockedAccts.has(a);
                const um = ENTRIES.filter(e=>e.account===a&&!e.lettre).length;
                return (
                  <div key={a} onClick={()=>toggleCheck(a)}
                    style={{padding:"4px 9px 4px "+indent+"px",cursor:"pointer",borderRadius:3,marginTop:1,
                      background:active?`${color}12`:"transparent",borderLeft:active?`3px solid ${color}`:"3px solid transparent",
                      opacity:isCent?0.6:1,transition:"all 0.1s"}}
                    onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}}
                    onMouseLeave={e=>{e.currentTarget.style.background=active?`${color}12`:"transparent"}}>
                    <div style={{fontSize:10,fontWeight:active?700:500,color:active?color:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                      <span style={{display:"flex",gap:3,alignItems:"center"}}>
                        {!locked&&<span onClick={(ev)=>{ev.stopPropagation();handleRemoveAccount(a);}}
                          style={{fontSize:9,padding:"0 3px",cursor:"pointer",color:"#dc2626",fontWeight:700,opacity:0.4,transition:"opacity 0.12s"}}
                          onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}
                          title="Supprimer">✕</span>}
                        {locked&&<span style={{fontSize:8,color:"#a8a29e"}} title="Compte verrouillé">🔒</span>}
                        {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                      </span>
                    </div>
                    <div style={{fontSize:8,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                  </div>
                );
              };

              // Fonction de rendu d'une sous-racine avec ses enfants
              const renderSubRoot = (r, color, indent) => {
                const isCent = centralizedRoots.has(r.number);
                const rChildren = r.children.filter(c => accounts.includes(c)).sort((a,b)=>a.localeCompare(b));
                const locked = lockedAccts.has(r.number);
                return (
                  <div key={r.number} style={{marginLeft:indent}}>
                    <div style={{padding:"4px 9px",display:"flex",alignItems:"center",gap:4,fontSize:9,color:isCent?color:"#78716c",marginTop:2,borderRadius:3,
                      background:isCent?`${color}08`:"transparent"}}>
                      <span style={{fontFamily:"monospace",fontWeight:700,fontSize:9,color:color}}>{r.number}</span>
                      <span style={{flex:1,fontSize:9,fontWeight:600}}>{r.name}</span>
                      {!locked&&<span onClick={(ev)=>{ev.stopPropagation();handleRemoveRoot(r.number);}}
                        style={{fontSize:9,padding:"0 3px",cursor:"pointer",color:"#dc2626",fontWeight:700,opacity:0.4,transition:"opacity 0.12s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}
                        title="Supprimer">✕</span>}
                      <span onClick={(ev)=>{ev.stopPropagation();setCentralizedRoots(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;});setPage(0);setExpandedAcct(null);}}
                        style={{fontSize:7,padding:"1px 5px",borderRadius:3,cursor:"pointer",fontWeight:700,
                          background:isCent?"#c9a227":"transparent",color:isCent?"#fff":"#a8a29e",
                          border:`1px solid ${isCent?"#c9a227":"#d6d0c4"}`,transition:"all 0.15s"}}
                        title={isCent?"Désactiver centralisation":"Centraliser"}>C</span>
                    </div>
                    {showDetail && rChildren.map(a => renderDetail(a, color, 24, isCent))}
                  </div>
                );
              };

              return visibleClassRoots.map(classRoot => {
                const ac = ACCOUNT_CLASSES[classRoot.number] || { label: classRoot.name, color: "#78716c" };
                const color = ac.color;
                const isCol = collapsed.has(`cls_${classRoot.number}`);
                // Pour une racine de classe (1 chiffre) : comptes dont le 1er chiffre correspond
                // Pour une sous-racine (2+ chiffres) en balance partielle : comptes dont le numéro commence par la racine
                const clsAccts = classRoot.number.length === 1
                  ? accounts.filter(a => a.charAt(0) === classRoot.number)
                  : accounts.filter(a => a.startsWith(classRoot.number));
                const clsChecked = clsAccts.filter(a => checkedAccts.has(a)).length;
                const allClsChecked = clsChecked === clsAccts.length && clsAccts.length > 0;
                const isCent = centralizedRoots.has(classRoot.number);
                const locked = lockedAccts.has(classRoot.number);

                // Sous-racines de cette classe (racines dont cls = classRoot.number et number != classRoot.number)
                const subRoots = dynamicRoots.filter(r =>
                  r.cls === classRoot.number && r.number !== classRoot.number &&
                  r.children.some(c => clsAccts.includes(c))
                ).sort((a,b)=>a.number.localeCompare(b.number));

                // Comptes assignés aux sous-racines
                const subAssigned = new Set();
                subRoots.forEach(r => r.children.forEach(c => subAssigned.add(c)));

                // Enfants directs de la classRoot non assignés à une sous-racine
                const directChildren = (classRoot.children || [])
                  .filter(c => clsAccts.includes(c) && !subAssigned.has(c))
                  .sort((a,b)=>a.localeCompare(b));

                // Orphelins (comptes de la classe sans racine)
                const allAssigned = new Set([...subAssigned, ...(classRoot.children||[])]);
                const orphans = clsAccts.filter(a => !allAssigned.has(a)).sort((a,b)=>a.localeCompare(b));

                // Liste unifiée triée
                const items = [];
                directChildren.forEach(a => items.push({type:"detail", number:a}));
                subRoots.forEach(r => items.push({type:"subRoot", number:r.number, root:r}));
                orphans.forEach(a => items.push({type:"detail", number:a}));
                items.sort((a,b)=>a.number.localeCompare(b.number));

                return (
                  <div key={classRoot.number} style={{marginBottom:3}}>
                    {/* En-tête racine de classe */}
                    <div style={{padding:"6px 9px",display:"flex",alignItems:"center",gap:5,borderRadius:5,fontSize:10,fontWeight:700,
                      color:color,background:allClsChecked?`${color}15`:`${color}08`,userSelect:"none",
                      borderLeft:allClsChecked?`3px solid ${color}`:"3px solid transparent",transition:"all 0.12s"}}>
                      <span onClick={()=>{setCollapsed(p=>{const n=new Set(p);const k=`cls_${classRoot.number}`;if(n.has(k))n.delete(k);else n.add(k);return n;})}}
                        style={{fontSize:8,transition:"transform 0.15s",transform:isCol?"rotate(-90deg)":"rotate(0)",cursor:"pointer",padding:"2px"}}>▼</span>
                      <span onClick={()=>toggleClassSelect(classRoot.number)} style={{cursor:"pointer",flex:1}}>
                        <span style={{fontWeight:800,marginRight:4}}>{classRoot.number}</span> — {classRoot.name}
                      </span>
                      {!locked&&<span onClick={(ev)=>{ev.stopPropagation();handleRemoveRoot(classRoot.number);}}
                        style={{fontSize:9,padding:"0 3px",cursor:"pointer",color:"#dc2626",fontWeight:700,opacity:0.4,transition:"opacity 0.12s"}}
                        onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}
                        title="Supprimer cette classe">✕</span>}
                      <span onClick={(ev)=>{ev.stopPropagation();setCentralizedRoots(p=>{const n=new Set(p);if(n.has(classRoot.number))n.delete(classRoot.number);else n.add(classRoot.number);return n;});setPage(0);setExpandedAcct(null);}}
                        style={{fontSize:7,padding:"1px 5px",borderRadius:3,cursor:"pointer",fontWeight:700,
                          background:isCent?"#c9a227":"transparent",color:isCent?"#fff":"#a8a29e",
                          border:`1px solid ${isCent?"#c9a227":"#d6d0c4"}`,transition:"all 0.15s",marginRight:2}}
                        title={isCent?"Désactiver centralisation":"Centraliser"}>C</span>
                      <span style={{fontSize:9,opacity:0.6}}>{clsChecked>0&&<span style={{color,fontWeight:800}}>{clsChecked}/</span>}{clsAccts.length}</span>
                    </div>
                    {/* Enfants */}
                    {!isCol && items.map(item => {
                      if (item.type === "subRoot") return renderSubRoot(item.root, color, 8);
                      return renderDetail(item.number, color, 16, isCent);
                    })}
                  </div>
                );
              });

            })()
            )}
          </div>
        </div>

        {/* ══════════ ZONE PRINCIPALE ══════════ */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,overflow:"hidden",padding:"14px 18px"}}>

          {/* KPI Cards — toujours visibles */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8,marginBottom:14}}>
            {[
              {l:"Total Débit",v:fmt(totals.d)+" €",c:"#1c1917",bg:"#faf9f6"},
              {l:"Total Crédit",v:fmt(totals.c)+" €",c:"#1c1917",bg:"#faf9f6"},
              {l:"Soldes Débiteurs",v:fmt(totals.sd)+" €",c:"#16a34a",bg:"#f0fdf4"},
              {l:"Soldes Créditeurs",v:fmt(totals.sc)+" €",c:"#dc2626",bg:"#fef2f2"},
              ...(isTiers ? [{l:"Non lettrées",v:String(totals.nbNL),c:totals.nbNL>0?"#dc2626":"#16a34a",bg:totals.nbNL>0?"#fef2f2":"#dcfce7"}]
                : [{l:"Équilibre",v:totals.diff<0.01?"✓ OK":fmt(totals.diff)+" €",c:totals.diff<0.01?"#16a34a":"#dc2626",bg:totals.diff<0.01?"#dcfce7":"#fef2f2"}]),
              {l:"Comptes",v:String(totals.nbAccts),c:"#0891b2",bg:"#ecfeff"},
            ].map((m,i) => (
              <div key={i} style={{background:m.bg,borderRadius:7,border:"1px solid #e8e4db",padding:"10px 12px",textAlign:"center"}}>
                <div style={{fontSize:9,color:"#a8a29e",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4}}>{m.l}</div>
                <div style={{fontSize:16,fontWeight:800,color:m.c,marginTop:3,fontVariantNumeric:"tabular-nums"}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Filtre de période */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#78716c",textTransform:"uppercase",letterSpacing:0.5}}>Période</span>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:10,color:"#a8a29e"}}>Du</span>
              <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(0);}}
                style={{padding:"5px 8px",borderRadius:5,border:"1.5px solid #d6d0c4",fontSize:10,fontFamily:"inherit",background:"#fff",color:"#1c1917",outline:"none"}}/>
              <span style={{fontSize:10,color:"#a8a29e"}}>au</span>
              <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(0);}}
                style={{padding:"5px 8px",borderRadius:5,border:"1.5px solid #d6d0c4",fontSize:10,fontFamily:"inherit",background:"#fff",color:"#1c1917",outline:"none"}}/>
            </div>
          </div>
          {/* Raccourcis mensuels — plage continue : 1er clic = début, 2e clic = fin */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:8,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:600,color:"#a8a29e",textTransform:"uppercase",letterSpacing:0.4,marginRight:4}}>Mois</span>
            <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1.5px solid #d6d0c4"}}>
              {MONTHS.map((p,i) => {
                const isStart = i === selMonthStart;
                const isEnd = i === selMonthEnd;
                const inRange = i >= selMonthStart && i <= selMonthEnd && selMonthStart >= 0 && selMonthEnd >= 0;
                const isEdge = isStart || isEnd;
                const isWaiting = monthClickPhase === 1 && i === monthFirstClick;
                return (
                  <div key={i} onClick={()=>handleMonthClick(i)}
                    style={{padding:"5px 0",textAlign:"center",cursor:"pointer",userSelect:"none",flex:1,minWidth:38,
                      borderRight: i < 11 ? "0.5px solid #e8e4db" : "none",
                      background: isEdge ? "#c9a227" : inRange ? "#c9a22720" : "#fff",
                      color: isEdge ? "#fff" : inRange ? "#8b6914" : "#78716c",
                      fontWeight: inRange ? 700 : 400,
                      fontSize: 11,
                      outline: isWaiting ? "2px solid #c9a22780" : "none",
                      outlineOffset: "-2px",
                      transition: "all 0.12s"}}>
                    {p.l}
                  </div>
                );
              })}
            </div>
            {monthClickPhase === 1 && (
              <span style={{fontSize:9,color:"#c9a227",fontWeight:600,fontStyle:"italic"}}>Cliquez un 2e mois pour définir la fin de période</span>
            )}
          </div>
          {/* Raccourcis trimestriels + exercice */}
          <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:9,fontWeight:600,color:"#a8a29e",textTransform:"uppercase",letterSpacing:0.4,marginRight:4}}>Trim.</span>
            {[
              {l:"T1",from:"2025-01-01",to:"2025-03-31"},
              {l:"T2",from:"2025-04-01",to:"2025-06-30"},
              {l:"T3",from:"2025-07-01",to:"2025-09-30"},
              {l:"T4",from:"2025-10-01",to:"2025-12-31"},
              {l:"S1",from:"2025-01-01",to:"2025-06-30"},
              {l:"S2",from:"2025-07-01",to:"2025-12-31"},
              {l:"Exercice",from:"2025-01-01",to:"2025-12-31"},
            ].map((p,i) => {
              const isActive = dateFrom === p.from && dateTo === p.to;
              return (
                <button key={i} onClick={()=>{setDateFrom(p.from);setDateTo(p.to);setMonthClickPhase(0);setPage(0);}}
                  style={{padding:"3px 10px",borderRadius:4,fontSize:9,fontWeight:isActive?700:400,cursor:"pointer",fontFamily:"inherit",
                    border:`1.5px solid ${isActive?"#c9a227":"#d6d0c4"}`,background:isActive?"#c9a227":"#fff",color:isActive?"#fff":"#57534e",
                    transition:"all 0.12s"}}>{p.l}</button>
              );
            })}
            {(dateFrom !== "2025-01-01" || dateTo !== "2025-12-31") && (
              <button onClick={()=>{setDateFrom("2025-01-01");setDateTo("2025-12-31");setMonthClickPhase(0);setPage(0);}}
                style={{padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                  border:"1.5px solid #dc2626",background:"transparent",color:"#dc2626",marginLeft:4}}>✕ Réinit.</button>
            )}
          </div>

          {/* Options d'affichage */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#78716c",textTransform:"uppercase",letterSpacing:0.5}}>Affichage</span>
            <button onClick={()=>{if(!disableBasicOptions)setShowTotals(s=>!s);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,
                cursor:disableBasicOptions?"not-allowed":"pointer",fontFamily:"inherit",opacity:disableBasicOptions?0.4:1,
                border:`1.5px solid ${showTotals&&!disableBasicOptions?"#c9a227":"#d6d0c4"}`,background:showTotals&&!disableBasicOptions?"#c9a22710":"#fff",color:showTotals&&!disableBasicOptions?"#c9a227":"#78716c",
                transition:"all 0.12s"}}>
              <div style={{width:24,height:14,borderRadius:7,background:showTotals&&!disableBasicOptions?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:5,background:"#fff",position:"absolute",top:2,left:showTotals&&!disableBasicOptions?12:2,transition:"left 0.15s"}}/>
              </div>
              Total Débit / Crédit
            </button>
            <button onClick={()=>{if(!disableBasicOptions)setSplitSolde(s=>!s);}}
              style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,
                cursor:disableBasicOptions?"not-allowed":"pointer",fontFamily:"inherit",opacity:disableBasicOptions?0.4:1,
                border:`1.5px solid ${splitSolde&&!disableBasicOptions?"#c9a227":"#d6d0c4"}`,background:splitSolde&&!disableBasicOptions?"#c9a22710":"#fff",color:splitSolde&&!disableBasicOptions?"#c9a227":"#78716c",
                transition:"all 0.12s"}}>
              <div style={{width:24,height:14,borderRadius:7,background:splitSolde&&!disableBasicOptions?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:5,background:"#fff",position:"absolute",top:2,left:splitSolde&&!disableBasicOptions?12:2,transition:"left 0.15s"}}/>
              </div>
              Solde D / C séparés
            </button>
            <span style={{width:1,height:18,background:"#d6d0c4"}}/>
            <button onClick={()=>setShowMonthly(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${showMonthly?"#c9a227":"#d6d0c4"}`,background:showMonthly?"#c9a22710":"#fff",color:showMonthly?"#c9a227":"#78716c",
                transition:"all 0.12s"}}>
              <div style={{width:24,height:14,borderRadius:7,background:showMonthly?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:5,background:"#fff",position:"absolute",top:2,left:showMonthly?12:2,transition:"left 0.15s"}}/>
              </div>
              Ventilation mensuelle
            </button>
            <button onClick={()=>setShowCompare(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:5,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                border:`1.5px solid ${showCompare?"#c9a227":"#d6d0c4"}`,background:showCompare?"#c9a22710":"#fff",color:showCompare?"#c9a227":"#78716c",
                transition:"all 0.12s"}}>
              <div style={{width:24,height:14,borderRadius:7,background:showCompare?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:10,height:10,borderRadius:5,background:"#fff",position:"absolute",top:2,left:showCompare?12:2,transition:"left 0.15s"}}/>
              </div>
              Comparatif N-1
            </button>
          </div>

          {/* Recherche multi-comptes */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",maxWidth:500}}>
              <span style={{fontSize:10,fontWeight:700,color:"#78716c",textTransform:"uppercase",letterSpacing:0.5}}>Rechercher</span>
              {mainSearchTags.map(tag => (
                <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:4,
                  background:"#c9a22715",border:"1px solid #c9a22740",fontSize:10,fontWeight:600,color:"#8b6914"}}>
                  <span style={{fontFamily:"monospace"}}>{tag}</span>
                  <span style={{fontSize:9,color:"#57534e"}}>{ACCOUNT_NAMES[tag] || ""}</span>
                  <span onClick={()=>handleRemoveMainTag(tag)}
                    style={{cursor:"pointer",color:"#dc2626",fontWeight:700,fontSize:11,marginLeft:2,opacity:0.6,transition:"opacity 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.6"}>✕</span>
                </span>
              ))}
              <div style={{position:"relative",width:200}}>
                <input type="text" placeholder={mainSearchTags.length > 0 ? "Ajouter un filtre…" : "Filtrer par compte…"}
                  value={mainSearchInput}
                  onChange={e=>{setMainSearchInput(e.target.value);setShowMainDropdown(true);}}
                  onFocus={()=>{if(mainSearchInput.trim())setShowMainDropdown(true);}}
                  onBlur={()=>setTimeout(()=>setShowMainDropdown(false),200)}
                  style={{width:"100%",padding:"5px 10px",borderRadius:5,border:`1.5px solid ${mainSearchInput?"#c9a227":"#d6d0c4"}`,
                    fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
                {showMainDropdown && mainSuggestions.length > 0 && (
                  <div style={{position:"absolute",top:"100%",right:0,width:350,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                    border:"1.5px solid #c9a227",boxShadow:"0 6px 16px rgba(0,0,0,0.12)",maxHeight:200,overflowY:"auto"}}>
                    {mainSuggestions.map(s => (
                      <div key={s.account} onMouseDown={()=>handleAddMainTag(s.account)}
                        style={{padding:"6px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
                          borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#f5f3ee"}
                        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                        <div>
                          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:getAC(s.account).color,marginRight:6}}>{s.account}</span>
                          <span style={{fontSize:10,color:"#57534e"}}>{s.name}</span>
                        </div>
                        <span style={{fontSize:10,fontWeight:500,color:s.solde>0.005?"#16a34a":s.solde<-0.005?"#dc2626":"#78716c",fontVariantNumeric:"tabular-nums"}}>
                          {Math.abs(s.solde)>0.005?`${fmt(Math.abs(s.solde))} ${s.solde>0?"D":"C"}`:"Soldé"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {mainSearchTags.length > 0 && (
                <button onClick={()=>{setMainSearchTags([]);setPage(0);}}
                  style={{padding:"4px 8px",borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                    border:"1.5px solid #dc2626",background:"transparent",color:"#dc2626"}}>✕ Effacer filtres</button>
              )}
            </div>
          </div>

          {/* Pagination top */}
          {totalPages > 1 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:11,color:"#78716c"}}>
                Comptes {page * perPage + 1}–{Math.min((page+1) * perPage, filteredRows.length)} sur {filteredRows.length}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,color:"#a8a29e"}}>Par page :</span>
                {[5,10,20].map(n=>(
                  <button key={n} onClick={()=>{setPerPage(n);setPage(0);}} style={{
                    padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:perPage===n?700:500,cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${perPage===n?"#1c1917":"#d6d0c4"}`,background:perPage===n?"#1c1917":"transparent",color:perPage===n?"#fff":"#57534e"
                  }}>{n}</button>
                ))}
                <div style={{width:1,height:16,background:"#d6d0c4",margin:"0 4px"}}/>
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid #d6d0c4",background:page===0?"#f5f3ee":"#fff",color:page===0?"#d6d0c4":"#1c1917",fontSize:11,fontWeight:600,cursor:page===0?"default":"pointer",fontFamily:"inherit"}}>← Préc.</button>
                <span style={{fontSize:11,fontWeight:700,color:"#1c1917",minWidth:40,textAlign:"center"}}>{page+1} / {totalPages}</span>
                <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid #d6d0c4",background:page>=totalPages-1?"#f5f3ee":"#fff",color:page>=totalPages-1?"#d6d0c4":"#1c1917",fontSize:11,fontWeight:600,cursor:page>=totalPages-1?"default":"pointer",fontFamily:"inherit"}}>Suiv. →</button>
                <div style={{width:1,height:16,background:"#d6d0c4",margin:"0 4px"}}/>
                <button onClick={()=>window.print()}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid #d6d0c4",background:"#fff",color:"#1c1917",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                  🖨️ Imprimer
                </button>
                <button onClick={()=>{
                  const headers = ["Compte","Libellé","Solde","Écritures"];
                  const rows = sortedRows.map(r => [r.account, r.name, (Math.abs(r.solde)>0.005?((r.solde>0?r.solde:-r.solde).toFixed(2).replace(".",",")+" "+(r.solde>0?"D":"C")):"Soldé"), r.nbEcritures]);
                  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(";")).join("\n");
                  const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href=url; a.download="balance.csv"; a.click(); URL.revokeObjectURL(url);
                }}
                  style={{padding:"4px 10px",borderRadius:5,border:"1px solid #c9a227",background:"#fff",color:"#8b6914",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                  ⬇️ Export CSV
                </button>
              </div>
            </div>
          )}

          {/* TABLE */}
          {sortedRows.length === 0 ? (
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#faf9f6",borderRadius:8,border:"1px solid #d6d0c4"}}>
              <div style={{textAlign:"center",color:"#a8a29e"}}>
                <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{bt.empty ? "Balance partielle — aucun compte chargé" : "Aucun compte sélectionné"}</div>
                <div style={{fontSize:11}}>{bt.empty ? "Ajoutez des comptes depuis le plan comptable via le champ de recherche dans la sidebar." : "Cochez des comptes dans la sidebar pour afficher la balance."}</div>
              </div>
            </div>
          ) :
          (()=>{
            // Constantes largeurs colonnes sticky
            const COL_W = { compte: 100, libelle: 140, solde: 110 };
            const STICKY_TOTAL = COL_W.compte + COL_W.libelle + COL_W.solde;
            const stickyCompte = { position:"sticky",left:0,zIndex:4,width:COL_W.compte,minWidth:COL_W.compte,maxWidth:COL_W.compte };
            const stickyLibelle = { position:"sticky",left:COL_W.compte,zIndex:4,width:COL_W.libelle,minWidth:COL_W.libelle,maxWidth:COL_W.libelle };
            const stickySolde = { position:"sticky",left:COL_W.compte+COL_W.libelle,zIndex:4,width:COL_W.solde,minWidth:COL_W.solde,maxWidth:COL_W.solde,borderRight:"2px solid #c9a227" };

            return (showMonthly || showCompare) ? (
            /* ══════ VUE MENSUELLE / COMPARATIF ══════ */
            <div style={{background:"#faf9f6",borderRadius:8,border:"1px solid #d6d0c4",flex:1,minHeight:0,overflowY:"auto",overflowX:"auto"}}>
                <table style={{borderCollapse:"separate",borderSpacing:0,fontSize:12,tableLayout:"fixed",
                  width:showMonthly?(showCompare?STICKY_TOTAL+12*3*75:STICKY_TOTAL+12*82):(STICKY_TOTAL+380)}}>
                  <thead>
                    {/* Ligne 1 : en-tête mois parent (uniquement si mensuel + comparatif) */}
                    {showMonthly && showCompare && (
                      <tr style={{background:"#f5f3ee",position:"sticky",top:0,zIndex:6}}>
                        <th style={{...stickyCompte,background:"#f5f3ee",borderBottom:"0.5px solid #e8e4db",padding:0}}></th>
                        <th style={{...stickyLibelle,background:"#f5f3ee",borderBottom:"0.5px solid #e8e4db",padding:0}}></th>
                        <th style={{...stickySolde,background:"#f5f3ee",borderBottom:"0.5px solid #e8e4db",padding:0}}></th>
                        {["Janv.","Fév.","Mars","Avr.","Mai","Juin","Juil.","Août","Sept.","Oct.","Nov.","Déc."].map((m,i) => (
                          <th key={i} colSpan={3} style={{padding:"5px 0",textAlign:"center",fontSize:11,fontWeight:500,
                            color:"#1c1917",borderBottom:"0.5px solid #e8e4db",borderRight:i<11?"1.5px solid #e8e4db":"none",background:"#f5f3ee",width:3*75}}>{m}</th>
                        ))}
                      </tr>
                    )}
                    {/* Ligne 2 : sous-en-têtes */}
                    <tr style={{background:"#f0ede6",position:"sticky",top:showMonthly&&showCompare?28:0,zIndex:5}}>
                      <th style={{...stickyCompte,background:"#f0ede6",...thStyle("account","left")}}>Compte</th>
                      <th style={{...stickyLibelle,background:"#f0ede6",...thStyle("name","left")}}>Libellé</th>
                      <th style={{...stickySolde,background:"#f0ede6",...thStyle("soldeD")}}>Solde total</th>
                      {showMonthly && !showCompare && (
                        ["Janv.","Fév.","Mars","Avr.","Mai","Juin","Juil.","Août","Sept.","Oct.","Nov.","Déc."].map((m,i) => (
                          <th key={i} style={{padding:"9px 10px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",
                            color:"#78716c",borderBottom:"2px solid #d6d0c4",whiteSpace:"nowrap",width:82,background:"#f5f3ee"}}>{m}</th>
                        ))
                      )}
                      {showMonthly && showCompare && (
                        [...Array(12)].map((_,i) => [
                          <th key={`n${i}`} style={{padding:"5px 8px",textAlign:"right",fontSize:8,fontWeight:500,letterSpacing:0.3,textTransform:"uppercase",color:"#1c1917",width:75,borderBottom:"1.5px solid #d6d0c4",background:"#f0ede6"}}>N</th>,
                          <th key={`n1${i}`} style={{padding:"5px 8px",textAlign:"right",fontSize:8,fontWeight:500,letterSpacing:0.3,textTransform:"uppercase",color:"#a8a29e",width:75,borderBottom:"1.5px solid #d6d0c4",background:"#f5f3ee"}}>N-1</th>,
                          <th key={`ec${i}`} style={{padding:"5px 8px",textAlign:"right",fontSize:8,fontWeight:500,letterSpacing:0.3,textTransform:"uppercase",color:"#c9a227",width:75,
                            borderRight:i<11?"1.5px solid #e8e4db":"none",borderBottom:"1.5px solid #d6d0c4",background:"#faf8f0"}}>Écart</th>,
                        ]).flat()
                      )}
                      {!showMonthly && showCompare && (<>
                        <th style={{padding:"9px 10px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#1c1917",width:95,borderBottom:"1.5px solid #d6d0c4",background:"#f0ede6"}}>Solde N</th>
                        <th style={{padding:"9px 10px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#a8a29e",width:95,borderBottom:"1.5px solid #d6d0c4",background:"#f5f3ee"}}>Solde N-1</th>
                        <th style={{padding:"9px 10px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#c9a227",width:85,borderBottom:"1.5px solid #d6d0c4",background:"#faf8f0"}}>Écart</th>
                        <th style={{padding:"9px 10px",textAlign:"right",fontSize:9,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#c9a227",width:65,borderBottom:"1.5px solid #d6d0c4",background:"#faf8f0"}}>Var. %</th>
                      </>)}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map((row, idx) => {
                      const ac = getAC(row.account);
                      const bg = idx % 2 === 0 ? "#fff" : "#faf9f6";
                      const soldeN1 = 0;
                      const ecart = row.solde - soldeN1;
                      const pct = soldeN1 !== 0 ? ((ecart / Math.abs(soldeN1)) * 100) : (row.solde !== 0 ? 100 : 0);
                      return (
                        <tr key={row.account}>
                          {/* Colonnes sticky */}
                          <td style={{...stickyCompte,background:bg,padding:"7px 10px",fontFamily:"monospace",fontSize:11,fontWeight:700,color:ac.color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",borderBottom:"1px solid #ece8e0"}}>
                            {row.account}
                            {row.isCentralized && <span style={{marginLeft:4,fontSize:7,padding:"1px 4px",borderRadius:3,fontWeight:700,background:"#c9a227",color:"#fff",verticalAlign:"middle"}}>C</span>}
                          </td>
                          <td style={{...stickyLibelle,background:bg,padding:"7px 10px",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",borderBottom:"1px solid #ece8e0"}}>{row.name}</td>
                          <td style={{...stickySolde,background:bg,...numTd,fontWeight:700,borderBottom:"1px solid #ece8e0",
                            color:row.solde>0.005?"#16a34a":row.solde<-0.005?"#dc2626":"#78716c"}}>
                            {Math.abs(row.solde)>0.005?`${fmt(Math.abs(row.solde))} ${row.solde>0?"D":"C"}`:"Soldé"}
                          </td>
                          {/* Colonnes scrollables */}
                          {showMonthly && (
                            [...Array(12)].map((_,mi) => {
                              const mm = String(mi+1).padStart(2,"0");
                              const val = row.monthly ? row.monthly[mm] : 0;
                              if (showCompare) {
                                const valN1 = 0;
                                const mEcart = val - valN1;
                                return [
                                  <td key={`n${mi}`} style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,whiteSpace:"nowrap",
                                    fontWeight:Math.abs(val)>0.005?500:400,color:val>0.005?"#16a34a":val<-0.005?"#dc2626":"#d6d0c4",borderBottom:"1px solid #ece8e0"}}>
                                    {Math.abs(val)>0.005?`${fmt(Math.abs(val))} ${val>0?"D":"C"}`:"—"}
                                  </td>,
                                  <td key={`n1${mi}`} style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,whiteSpace:"nowrap",
                                    color:"#a8a29e",borderBottom:"1px solid #ece8e0"}}>—</td>,
                                  <td key={`ec${mi}`} style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:9,whiteSpace:"nowrap",
                                    fontWeight:500,color:mEcart>0.005?"#16a34a":mEcart<-0.005?"#dc2626":"#d6d0c4",
                                    borderRight:mi<11?"1.5px solid #f0ece3":"none",borderBottom:"1px solid #ece8e0"}}>
                                    {Math.abs(mEcart)>0.005?`${mEcart>0?"+":""}${fmt(mEcart)}`:"—"}
                                  </td>,
                                ];
                              }
                              return (
                                <td key={mi} style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,whiteSpace:"nowrap",
                                  fontWeight:Math.abs(val)>0.005?500:400,color:val>0.005?"#16a34a":val<-0.005?"#dc2626":"#d6d0c4",borderBottom:"1px solid #ece8e0"}}>
                                  {Math.abs(val)>0.005?`${fmt(Math.abs(val))} ${val>0?"D":"C"}`:"—"}
                                </td>
                              );
                            }).flat()
                          )}
                          {!showMonthly && showCompare && (<>
                            <td style={{...numTd,fontWeight:700,borderBottom:"1px solid #ece8e0",color:row.solde>0.005?"#16a34a":row.solde<-0.005?"#dc2626":"#78716c"}}>
                              {Math.abs(row.solde)>0.005?`${fmt(Math.abs(row.solde))} ${row.solde>0?"D":"C"}`:"Soldé"}
                            </td>
                            <td style={{...numTd,color:"#a8a29e",borderBottom:"1px solid #ece8e0"}}>—</td>
                            <td style={{...numTd,fontWeight:500,borderBottom:"1px solid #ece8e0",color:ecart>0.005?"#16a34a":ecart<-0.005?"#dc2626":"#a8a29e"}}>
                              {Math.abs(ecart)>0.005?`${ecart>0?"+":""}${fmt(ecart)}`:"—"}
                            </td>
                            <td style={{padding:"7px 10px",textAlign:"right",borderBottom:"1px solid #ece8e0"}}>
                              {Math.abs(pct)>0.5 ? (
                                <span style={{fontSize:9,fontWeight:500,padding:"2px 6px",borderRadius:4,
                                  background:pct>0?"#EAF3DE":pct<0?"#FCEBEB":"#F1EFE8",
                                  color:pct>0?"#27500A":pct<0?"#791F1F":"#5F5E5A"}}>
                                  {pct>0?"+":""}{Math.round(pct)} %
                                </span>
                              ) : <span style={{fontSize:9,color:"#a8a29e"}}>—</span>}
                            </td>
                          </>)}
                        </tr>
                      );
                    })}
                    {/* Ligne totaux */}
                    <tr style={{background:"#f0ede6",fontWeight:800,borderTop:"2px solid #c9a227",position:"sticky",bottom:0,zIndex:5}}>
                      <td colSpan={2} style={{...stickyCompte,background:"#f0ede6",width:COL_W.compte+COL_W.libelle,minWidth:COL_W.compte+COL_W.libelle,maxWidth:COL_W.compte+COL_W.libelle,padding:"7px 10px",fontSize:9,textTransform:"uppercase",letterSpacing:0.5,color:"#78716c",textAlign:"right",borderBottom:"1px solid #d6d0c4"}}>Totaux ({totals.nbAccts})</td>
                      <td style={{...stickySolde,background:"#f0ede6",...numTd,fontWeight:800,fontSize:11,borderBottom:"1px solid #d6d0c4",
                        color:totals.sd>=totals.sc?"#16a34a":"#dc2626"}}>
                        {fmt(Math.abs(totals.sd - totals.sc))} {totals.sd>=totals.sc?"D":"C"}
                      </td>
                      {showMonthly && (
                        [...Array(12)].map((_,mi) => {
                          const mm = String(mi+1).padStart(2,"0");
                          const mTotal = sortedRows.reduce((s,r) => s + (r.monthly ? r.monthly[mm] : 0), 0);
                          if (showCompare) {
                            return [
                              <td key={`tn${mi}`} style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,whiteSpace:"nowrap",
                                fontWeight:700,color:Math.abs(mTotal)>0.005?(mTotal>0?"#16a34a":"#dc2626"):"#d6d0c4",borderBottom:"1px solid #d6d0c4"}}>
                                {Math.abs(mTotal)>0.005?`${fmt(Math.abs(mTotal))} ${mTotal>0?"D":"C"}`:"—"}
                              </td>,
                              <td key={`tn1${mi}`} style={{padding:"5px 8px",textAlign:"right",fontSize:10,color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>—</td>,
                              <td key={`tec${mi}`} style={{padding:"5px 8px",textAlign:"right",fontSize:9,color:"#d6d0c4",borderRight:mi<11?"1.5px solid #e8e4db":"none",borderBottom:"1px solid #d6d0c4"}}>—</td>,
                            ];
                          }
                          return (
                            <td key={mi} style={{padding:"7px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,whiteSpace:"nowrap",
                              fontWeight:700,color:Math.abs(mTotal)>0.005?(mTotal>0?"#16a34a":"#dc2626"):"#d6d0c4",borderBottom:"1px solid #d6d0c4"}}>
                              {Math.abs(mTotal)>0.005?`${fmt(Math.abs(mTotal))} ${mTotal>0?"D":"C"}`:"—"}
                            </td>
                          );
                        }).flat()
                      )}
                      {!showMonthly && showCompare && (<>
                        <td style={{...numTd,fontWeight:800,fontSize:11,borderBottom:"1px solid #d6d0c4",color:totals.sd>=totals.sc?"#16a34a":"#dc2626"}}>
                          {fmt(Math.abs(totals.sd - totals.sc))} {totals.sd>=totals.sc?"D":"C"}
                        </td>
                        <td style={{...numTd,color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>—</td>
                        <td style={{...numTd,color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>—</td>
                        <td style={{borderBottom:"1px solid #d6d0c4"}}></td>
                      </>)}
                    </tr>
                  </tbody>
                </table>
            </div>
          ) : (
          /* ══════ VUE STANDARD ══════ */
          (()=>{
            const colWidths = [];
            colWidths.push({w:"15%"}); // Compte
            colWidths.push({w:"auto"}); // Libellé
            if (showTotals) { colWidths.push({w:"12%"}); colWidths.push({w:"12%"}); }
            if (splitSolde) { colWidths.push({w:"10%"}); colWidths.push({w:"10%"}); } else { colWidths.push({w:"12%"}); }
            colWidths.push({w:"5%"}); // Éc.
            if (isTiers) { colWidths.push({w:"5%"}); colWidths.push({w:"5%"}); colWidths.push({w:"10%"}); }
            const colGroup = <colgroup>{colWidths.map((c,i) => <col key={i} style={{width:c.w}}/>)}</colgroup>;
            const tblStyle = {width:"100%",borderCollapse:"separate",borderSpacing:0,fontSize:12,tableLayout:"fixed"};

            return (
          <div style={{background:"#faf9f6",borderRadius:8,border:"1px solid #d6d0c4",flex:1,minHeight:0,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* THEAD fixe */}
              <div style={{flexShrink:0}}>
              <table style={tblStyle}>
                {colGroup}
                <thead>
                  <tr style={{background:"#f0ede6"}}>
                    <th onClick={()=>handleSort("account")} style={thStyle("account","left")}>Compte{sortIcon("account")}</th>
                    <th onClick={()=>handleSort("name")} style={{...thStyle("name","left"),minWidth:160}}>Libellé{sortIcon("name")}</th>
                    {showTotals && <th onClick={()=>handleSort("totalD")} style={thStyle("totalD")}>Total Débit{sortIcon("totalD")}</th>}
                    {showTotals && <th onClick={()=>handleSort("totalC")} style={thStyle("totalC")}>Total Crédit{sortIcon("totalC")}</th>}
                    {splitSolde ? <>
                      <th onClick={()=>handleSort("soldeD")} style={thStyle("soldeD")}>Solde D{sortIcon("soldeD")}</th>
                      <th onClick={()=>handleSort("soldeC")} style={thStyle("soldeC")}>Solde C{sortIcon("soldeC")}</th>
                    </> : (
                      <th onClick={()=>handleSort("soldeD")} style={thStyle("soldeD")}>Solde{sortIcon("soldeD")}</th>
                    )}
                    <th style={{padding:"9px 6px",textAlign:"center",fontSize:9,fontWeight:700,letterSpacing:0.7,textTransform:"uppercase",color:"#a8a29e",borderBottom:"2px solid #d6d0c4"}}>Éc.</th>
                    {isTiers && <>
                      <th style={{padding:"9px 6px",textAlign:"center",fontSize:9,fontWeight:700,letterSpacing:0.7,textTransform:"uppercase",color:"#16a34a",borderBottom:"2px solid #d6d0c4"}}>Let.</th>
                      <th style={{padding:"9px 6px",textAlign:"center",fontSize:9,fontWeight:700,letterSpacing:0.7,textTransform:"uppercase",color:"#dc2626",borderBottom:"2px solid #d6d0c4"}}>N.Let.</th>
                      <th onClick={()=>handleSort("soldeNL")} style={thStyle("soldeNL")}>Solde N.L.{sortIcon("soldeNL")}</th>
                    </>}
                  </tr>
                </thead>
              </table>
              </div>
              {/* TBODY scrollable */}
              <div style={{flex:1,overflowY:"auto",minHeight:0}}>
              <table style={tblStyle}>
                {colGroup}
                <tbody>
                  {pagedRows.map((row, idx) => {
                    const ac = getAC(row.account);
                    const isExp = expandedAcct === row.account;
                    const isCent = row.isCentralized;
                    return [
                      <tr key={row.account}
                        onClick={()=>(isTiers || isCent) && setExpandedAcct(isExp ? null : row.account)}
                        style={{borderBottom:"1px solid #ece8e0",background: isExp ? `${ac.color}08` : idx % 2 === 0 ? "transparent" : "#faf9f6",
                          cursor:(isTiers||isCent)?"pointer":"default",transition:"background 0.1s"}}
                        onMouseEnter={e => e.currentTarget.style.background = isExp ? `${ac.color}08` : "#f5f3ee"}
                        onMouseLeave={e => e.currentTarget.style.background = isExp ? `${ac.color}08` : idx % 2 === 0 ? "transparent" : "#faf9f6"}>
                        <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:11,fontWeight:700,color:ac.color}}>
                          {(isTiers||isCent) && <span style={{fontSize:8,marginRight:4,transition:"transform 0.15s",display:"inline-block",transform:isExp?"rotate(90deg)":"rotate(0)",color:"#a8a29e"}}>▶</span>}
                          {row.account}
                          {isCent && <span style={{marginLeft:6,fontSize:7,padding:"1px 5px",borderRadius:3,fontWeight:700,background:"#c9a227",color:"#fff",verticalAlign:"middle"}}>Centralisé</span>}
                        </td>
                        <td style={{padding:"7px 10px",fontSize:10,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.name}</td>
                        {showTotals && <td style={numTd}>{fmt(row.totalD)}</td>}
                        {showTotals && <td style={numTd}>{fmt(row.totalC)}</td>}
                        {splitSolde ? <>
                          <td style={{...numTd,fontWeight:700,color:row.soldeD > 0 ? "#16a34a" : "#d6d0c4"}}>{row.soldeD > 0 ? fmt(row.soldeD) : "—"}</td>
                          <td style={{...numTd,fontWeight:700,color:row.soldeC > 0 ? "#dc2626" : "#d6d0c4"}}>{row.soldeC > 0 ? fmt(row.soldeC) : "—"}</td>
                        </> : (
                          <td style={{...numTd,fontWeight:700,color:row.solde > 0.005 ? "#16a34a" : row.solde < -0.005 ? "#dc2626" : "#78716c"}}>
                            {Math.abs(row.solde) > 0.005 ? `${fmt(Math.abs(row.solde))} ${row.solde > 0 ? "D" : "C"}` : "Soldé"}
                          </td>
                        )}
                        <td style={{padding:"7px 6px",textAlign:"center",fontSize:9,color:"#a8a29e"}}>{row.nbEcritures}</td>
                        {isTiers && <>
                          <td style={{padding:"7px 6px",textAlign:"center"}}>
                            {row.nbLettrees > 0 ? <span style={{background:"#dcfce7",color:"#16a34a",fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:4}}>{row.nbLettrees}</span>
                              : <span style={{color:"#d6d0c4",fontSize:9}}>—</span>}
                          </td>
                          <td style={{padding:"7px 6px",textAlign:"center"}}>
                            {row.nbNonLettrees > 0 ? <span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:4}}>{row.nbNonLettrees}</span>
                              : <span style={{color:"#d6d0c4",fontSize:9}}>—</span>}
                          </td>
                          <td style={{...numTd,fontWeight:700,fontSize:10,color:row.soldeNL>0.005?"#16a34a":row.soldeNL<-0.005?"#dc2626":"#78716c"}}>
                            {Math.abs(row.soldeNL)>0.005?`${fmt(Math.abs(row.soldeNL))} ${row.soldeNL>0?"D":"C"}`:"Soldé"}
                          </td>
                        </>}
                      </tr>,
                      // Expansion : détail sous-comptes pour centralisé, écritures NL pour tiers
                      isExp && isCent && (
                        <tr key={`exp_${row.account}`}>
                          <td colSpan={2+(showTotals?2:0)+(splitSolde?2:1)+1} style={{padding:0,background:`${ac.color}06`,borderBottom:`2px solid ${ac.color}30`}}>
                            <div style={{padding:"8px 14px"}}>
                              <div style={{fontSize:10,fontWeight:700,color:ac.color,marginBottom:6}}>Sous-comptes — {row.account} ({row.childrenRows.length})</div>
                              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,background:"#fff",borderRadius:5,overflow:"hidden"}}>
                                <thead><tr style={{background:"#f0ede6"}}>
                                  {["Sous-compte","Libellé","Débit","Crédit","Solde","Éc."].map((h,i)=>
                                    <th key={i} style={{padding:"5px 8px",textAlign:i>=2?"right":"left",fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>{h}</th>
                                  )}
                                </tr></thead>
                                <tbody>
                                  {row.childrenRows.map((cr,ci) => (
                                    <tr key={cr.account} style={{borderBottom:"1px solid #f0ece3",background:ci%2===0?"transparent":"#faf9f6"}}>
                                      <td style={{padding:"5px 8px",fontFamily:"monospace",fontSize:10,fontWeight:600,color:ac.color}}>{cr.account}</td>
                                      <td style={{padding:"5px 8px",fontSize:10}}>{cr.name}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(cr.totalD)}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(cr.totalC)}</td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,fontWeight:700,
                                        color:cr.solde>0.005?"#16a34a":cr.solde<-0.005?"#dc2626":"#78716c"}}>
                                        {fmt(Math.abs(cr.solde))} {cr.solde>0.005?"D":cr.solde<-0.005?"C":""}
                                      </td>
                                      <td style={{padding:"5px 8px",textAlign:"right",fontSize:9,color:"#a8a29e"}}>{cr.nbEcritures}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot><tr style={{background:"#f0ede6",fontWeight:700}}>
                                  <td colSpan={2} style={{padding:"5px 8px",textAlign:"right",fontSize:8,color:"#78716c",textTransform:"uppercase"}}>Total {row.account}</td>
                                  <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(row.totalD)}</td>
                                  <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(row.totalC)}</td>
                                  <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,fontWeight:800,
                                    color:row.solde>0?"#16a34a":"#dc2626"}}>{fmt(Math.abs(row.solde))} {row.solde>0.005?"D":row.solde<-0.005?"C":""}</td>
                                  <td style={{padding:"5px 8px",textAlign:"right",fontSize:9}}>{row.nbEcritures}</td>
                                </tr></tfoot>
                              </table>
                            </div>
                          </td>
                        </tr>
                      ),
                      isExp && isTiers && !isCent && (
                        <tr key={`detail_${row.account}`}>
                          <td colSpan={2+(showTotals?2:0)+(splitSolde?2:1)+1+3} style={{padding:0,background:`${ac.color}06`,borderBottom:`2px solid ${ac.color}30`}}>
                            <div style={{padding:"8px 14px"}}>
                              <div style={{fontSize:10,fontWeight:700,color:ac.color,marginBottom:6}}>Écritures non lettrées — {row.account} ({row.detailNL.length})</div>
                              {row.detailNL.length === 0 ? (
                                <div style={{fontSize:10,color:"#a8a29e",fontStyle:"italic",padding:"8px 0"}}>Toutes les écritures sont lettrées.</div>
                              ) : (
                                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,background:"#fff",borderRadius:5,overflow:"hidden"}}>
                                  <thead><tr style={{background:"#f0ede6"}}>
                                    {["Date","Journal","Pièce","Libellé","Débit","Crédit"].map((h,i)=>
                                      <th key={i} style={{padding:"5px 8px",textAlign:i>=4?"right":"left",fontSize:8,fontWeight:700,letterSpacing:0.5,textTransform:"uppercase",color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>{h}</th>
                                    )}
                                  </tr></thead>
                                  <tbody>
                                    {row.detailNL.map((e,ei) => (
                                      <tr key={e.id} style={{borderBottom:"1px solid #f0ece3",background:ei%2===0?"transparent":"#faf9f6"}}>
                                        <td style={{padding:"5px 8px",fontSize:10,fontFamily:"monospace"}}>{e.date.split("-").reverse().join("/")}</td>
                                        <td style={{padding:"5px 8px",fontSize:9}}><span style={{background:"#f5f3ee",padding:"1px 5px",borderRadius:3,fontWeight:600,fontSize:8}}>{e.journal}</span></td>
                                        <td style={{padding:"5px 8px",fontSize:9,fontFamily:"monospace",color:"#78716c"}}>{e.piece}</td>
                                        <td style={{padding:"5px 8px",fontSize:10,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.label}</td>
                                        <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,fontWeight:e.debit>0?700:400,color:e.debit>0?"#1c1917":"#d6d0c4"}}>{e.debit>0?fmt(e.debit):"—"}</td>
                                        <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10,fontWeight:e.credit>0?700:400,color:e.credit>0?"#1c1917":"#d6d0c4"}}>{e.credit>0?fmt(e.credit):"—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot><tr style={{background:"#f0ede6",fontWeight:700}}>
                                    <td colSpan={4} style={{padding:"5px 8px",textAlign:"right",fontSize:8,color:"#78716c",textTransform:"uppercase"}}>Total non lettré</td>
                                    <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(row.soldeNL_D)}</td>
                                    <td style={{padding:"5px 8px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:10}}>{fmt(row.soldeNL_C)}</td>
                                  </tr></tfoot>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  }).flat().filter(Boolean)}
                </tbody>
              </table>
              </div>
              {/* TFOOT fixe */}
              <div style={{flexShrink:0,borderTop:"2px solid #c9a227"}}>
              <table style={tblStyle}>
                {colGroup}
                <tfoot>
                  {(()=>{
                    const baseCols = 2 + (showTotals?2:0) + (splitSolde?2:1) + 1;
                    const tiersCols = isTiers ? 3 : 0;
                    const totalCols = baseCols + tiersCols;
                    return <>
                  <tr style={{background:"#f0ede6",fontWeight:800}}>
                    <td colSpan={2} style={{padding:"9px 10px",fontSize:10,textTransform:"uppercase",letterSpacing:0.6,color:"#78716c",textAlign:"right",background:"#f0ede6"}}>
                      Totaux ({totals.nbAccts} comptes)
                    </td>
                    {showTotals && <td style={{...numTd,fontWeight:800,fontSize:12,background:"#f0ede6"}}>{fmt(totals.d)}</td>}
                    {showTotals && <td style={{...numTd,fontWeight:800,fontSize:12,background:"#f0ede6"}}>{fmt(totals.c)}</td>}
                    {splitSolde ? <>
                      <td style={{...numTd,fontWeight:800,fontSize:12,color:"#16a34a",background:"#f0ede6"}}>{fmt(totals.sd)}</td>
                      <td style={{...numTd,fontWeight:800,fontSize:12,color:"#dc2626",background:"#f0ede6"}}>{fmt(totals.sc)}</td>
                    </> : (
                      <td style={{...numTd,fontWeight:800,fontSize:12,color:totals.sd>=totals.sc?"#16a34a":"#dc2626",background:"#f0ede6"}}>
                        {fmt(Math.abs(totals.sd - totals.sc))} {totals.sd>=totals.sc?"D":"C"}
                      </td>
                    )}
                    <td style={{padding:"9px 6px",textAlign:"center",fontSize:10,fontWeight:700,background:"#f0ede6"}}>{sortedRows.reduce((s,r)=>s+r.nbEcritures,0)}</td>
                    {isTiers && <>
                      <td style={{padding:"9px 6px",textAlign:"center",fontSize:10,fontWeight:700,color:"#16a34a",background:"#f0ede6"}}>{totals.nbL}</td>
                      <td style={{padding:"9px 6px",textAlign:"center",fontSize:10,fontWeight:700,color:"#dc2626",background:"#f0ede6"}}>{totals.nbNL}</td>
                      <td style={{background:"#f0ede6"}}/>
                    </>}
                  </tr>
                  <tr style={{background:!isTiers ? (totals.diff < 0.01 ? "#dcfce7" : "#fef2f2") : "#f5f3ee"}}>
                    <td colSpan={totalCols}
                      style={{padding:"8px 10px",textAlign:"center",fontSize:11,fontWeight:700,
                        color:!isTiers ? (totals.diff < 0.01 ? "#16a34a" : "#dc2626") : "#78716c"}}>
                      {!isTiers
                        ? (totals.diff < 0.01 ? "✓ Balance équilibrée — Σ Soldes Débiteurs = Σ Soldes Créditeurs" : `✗ Déséquilibre — Écart : ${fmt(totals.diff)} €`)
                        : `${bt.id === "clients" ? "Créances" : "Dettes"} ouvertes (non lettrées) : ${totals.nbNL} écritures`
                      }
                    </td>
                  </tr>
                    </>;
                  })()}
                </tfoot>
              </table>
              </div>
          </div>
          )})()
          )})()}

          {/* Pagination bottom */}
          {totalPages > 1 && (
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
              <div style={{fontSize:11,color:"#78716c"}}>Page {page+1} sur {totalPages} · {sortedRows.length} comptes</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}
                  style={{padding:"5px 12px",borderRadius:5,border:"1px solid #d6d0c4",background:page===0?"#f5f3ee":"#fff",color:page===0?"#d6d0c4":"#1c1917",fontSize:11,fontWeight:600,cursor:page===0?"default":"pointer",fontFamily:"inherit"}}>← Précédent</button>
                {Array.from({length:totalPages},(_,i)=>i).map(i=>(
                  <button key={i} onClick={()=>setPage(i)} style={{
                    width:28,height:28,borderRadius:6,border:`1px solid ${page===i?"#1c1917":"#d6d0c4"}`,
                    background:page===i?"#1c1917":"#fff",color:page===i?"#fff":"#57534e",
                    fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  }}>{i+1}</button>
                ))}
                <button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1}
                  style={{padding:"5px 12px",borderRadius:5,border:"1px solid #d6d0c4",background:page>=totalPages-1?"#f5f3ee":"#fff",color:page>=totalPages-1?"#d6d0c4":"#1c1917",fontSize:11,fontWeight:600,cursor:page>=totalPages-1?"default":"pointer",fontFamily:"inherit"}}>Suivant →</button>
              </div>
            </div>
          )}

          {/* Légende */}
          <div style={{marginTop:10,display:"flex",gap:16,fontSize:10,color:"#a8a29e",flexWrap:"wrap"}}>
            <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:11,height:11,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:2,display:"inline-block"}}/>Solde D</span>
            <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:11,height:11,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:2,display:"inline-block"}}/>Solde C</span>
            <span>Éc. = nombre d'écritures</span>
            {!isTiers && <span>Centralisé = sous-comptes agrégés (cliquez pour détail)</span>}
            {isTiers && <span>Let. = lettrées · N.Let. = non lettrées · Cliquez pour le détail</span>}
          </div>

        </div>
      </div>
    </div>
  );
}
