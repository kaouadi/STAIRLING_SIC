import { useState, useMemo, useCallback } from "react";

const ACCOUNT_NAMES = {
  // Classe 1 — Capitaux
  "101000":"Capital social","106100":"Réserve légale","120000":"Résultat de l'exercice",
  // Classe 2 — Immobilisations
  "218200":"Matériel de transport","218300":"Matériel de bureau et informatique","280000":"Amort. immobilisations incorporelles",
  // Classe 3 — Stocks
  "310000":"Stocks de matières premières",
  // Classe 4 — Tiers
  "4110UBER":"Clients — UBER","4110BOLT":"Clients — BOLT","4110HEETCH":"Clients — HEETCH",
  "4010UBER":"Fournisseurs — UBER (commissions)","4010BOLT":"Fournisseurs — BOLT (commissions)","4010HEETCH":"Fournisseurs — HEETCH (commissions)",
  "4210DUPONT":"Rémunérations dues — DUPONT","4210XAVIER":"Rémunérations dues — XAVIER","4210KARIM":"Rémunérations dues — KARIM",
  "445711UBER":"TVA collectée UBER 10%","445711BOLT":"TVA collectée BOLT 10%","445711HEETCH":"TVA collectée HEETCH 10%",
  "445660UBER":"TVA déduct. comm. UBER 20% (autoliq.)","445660BOLT":"TVA déduct. comm. BOLT 20% (autoliq.)",
  // Classe 5 — Financiers
  "512000":"Banque Société Générale",
  // Classe 6 — Charges
  "62261DUPONT":"Commission UBER — DUPONT","62261XAVIER":"Commission UBER — XAVIER","62262DUPONT":"Commission BOLT — DUPONT",
  "6061DUPONT":"Carburant — DUPONT","6061XAVIER":"Carburant — XAVIER","6135DUPONT":"Location véhicule — DUPONT",
  "6152DUPONT":"Entretien véhicule — DUPONT","6155DUPONT":"Téléphonie — DUPONT","6251DUPONT":"Péages & déplacements — DUPONT",
  "6811DUPONT":"Dotation amort. véhicule — DUPONT",
  // Classe 7 — Produits
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

// Comptes racines (SUMMARY) — sélectionner une racine ajoute tous ses enfants
const ACCOUNT_ROOTS = [
  // Classe 1
  { number: "101", name: "CAPITAL SOCIAL", cls: "1", children: ["101000"] },
  { number: "106", name: "RÉSERVES", cls: "1", children: ["106100"] },
  { number: "120", name: "RÉSULTAT DE L'EXERCICE", cls: "1", children: ["120000"] },
  // Classe 2
  { number: "2182", name: "MATÉRIEL DE TRANSPORT", cls: "2", children: ["218200"] },
  { number: "2183", name: "MATÉRIEL BUREAU & INFORMATIQUE", cls: "2", children: ["218300"] },
  { number: "280", name: "AMORT. IMMOBILISATIONS", cls: "2", children: ["280000"] },
  // Classe 3
  { number: "310", name: "STOCKS MATIÈRES PREMIÈRES", cls: "3", children: ["310000"] },
  // Classe 4
  { number: "401", name: "FOURNISSEURS", cls: "4", children: ["4010UBER","4010BOLT","4010HEETCH"] },
  { number: "411", name: "CLIENTS", cls: "4", children: ["4110UBER","4110BOLT","4110HEETCH"] },
  { number: "421", name: "RÉMUNÉRATIONS DUES", cls: "4", children: ["4210DUPONT","4210XAVIER","4210KARIM"] },
  { number: "4456", name: "TVA DÉDUCTIBLE", cls: "4", children: ["445660UBER","445660BOLT"] },
  { number: "4457", name: "TVA COLLECTÉE", cls: "4", children: ["445711UBER","445711BOLT","445711HEETCH"] },
  // Classe 5
  { number: "512", name: "BANQUES", cls: "5", children: ["512000"] },
  // Classe 6
  { number: "6061", name: "CARBURANT", cls: "6", children: ["6061DUPONT","6061XAVIER"] },
  { number: "6135", name: "LOCATION VÉHICULE", cls: "6", children: ["6135DUPONT"] },
  { number: "6152", name: "ENTRETIEN VÉHICULE", cls: "6", children: ["6152DUPONT"] },
  { number: "6155", name: "TÉLÉPHONIE", cls: "6", children: ["6155DUPONT"] },
  { number: "62261", name: "COMMISSION UBER", cls: "6", children: ["62261DUPONT","62261XAVIER"] },
  { number: "62262", name: "COMMISSION BOLT", cls: "6", children: ["62262DUPONT"] },
  { number: "6251", name: "PÉAGES & DÉPLACEMENTS", cls: "6", children: ["6251DUPONT"] },
  { number: "6811", name: "DOTATION AMORTISSEMENTS", cls: "6", children: ["6811DUPONT"] },
  // Classe 7
  { number: "7061", name: "VENTES UBER", cls: "7", children: ["7061DUPONT","7061XAVIER","7061KARIM"] },
  { number: "7062", name: "VENTES BOLT", cls: "7", children: ["7062DUPONT","7062XAVIER"] },
  { number: "7063", name: "VENTES HEETCH", cls: "7", children: ["7063DUPONT"] },
];

const INITIAL_ENTRIES = [
  // ── Classe 1 — Capitaux ──
  {id:100,date:"2025-01-01",account:"101000",label:"Capital social — apport initial",journal:"AN",piece:"AN-2025-001",debit:0,credit:10000.00,lettre:""},
  {id:101,date:"2025-01-01",account:"106100",label:"Réserve légale",journal:"AN",piece:"AN-2025-002",debit:0,credit:1500.00,lettre:""},
  {id:102,date:"2025-01-01",account:"120000",label:"Report à nouveau exercice N-1",journal:"AN",piece:"AN-2025-003",debit:0,credit:3200.00,lettre:""},
  // ── Classe 2 — Immobilisations ──
  {id:103,date:"2025-01-01",account:"218200",label:"Véhicule Peugeot e-208 — valeur brute",journal:"AN",piece:"AN-2025-004",debit:32000.00,credit:0,lettre:""},
  {id:104,date:"2025-01-01",account:"218300",label:"Ordinateur portable + smartphone",journal:"AN",piece:"AN-2025-005",debit:2400.00,credit:0,lettre:""},
  {id:105,date:"2025-01-01",account:"280000",label:"Amort. cumulés immob. — report",journal:"AN",piece:"AN-2025-006",debit:0,credit:8000.00,lettre:""},
  {id:106,date:"2025-01-31",account:"280000",label:"Dotation amort. janv. 2025",journal:"OD",piece:"DOT-2025-001",debit:0,credit:533.33,lettre:""},
  // ── Classe 3 — Stocks ──
  {id:107,date:"2025-01-01",account:"310000",label:"Stock pièces détachées — report",journal:"AN",piece:"AN-2025-007",debit:850.00,credit:0,lettre:""},
  // ── Classe 6 — Dotation amort. ──
  {id:108,date:"2025-01-31",account:"6811DUPONT",label:"Dotation amort. véhicule janv.",journal:"OD",piece:"DOT-2025-001",debit:533.33,credit:0,lettre:""},
  // ── Classe 7 — Ventes ──
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

const NEXT_L = ["HH","II","JJ","KK","LL","MM","NN","OO","PP","QQ","RR","SS","TT","UU","VV","WW","XX","YY","ZZ"];
const fmt = n => n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2});

const LEDGER_TYPES = [
  { id: "global", label: "GRAND LIVRE GLOBAL", desc: "Toutes les familles de comptes (1 à 9)", filter: null, locked: true },
  { id: "fournisseurs", label: "GRAND LIVRE FOURNISSEURS", desc: "Comptes 401 — Fournisseurs", filter: a => a.startsWith("401"), locked: true },
  { id: "clients", label: "GRAND LIVRE CLIENTS", desc: "Comptes 411 — Clients", filter: a => a.startsWith("411"), locked: true },
  { id: "tiers", label: "GRAND LIVRE DE TIERS", desc: "Comptes 401 — Fournisseurs, 411 — Clients, 421 — Rémunérations dues", filter: a => a.startsWith("401") || a.startsWith("411") || a.startsWith("421"), locked: true },
  { id: "partiel", label: "GRAND LIVRE PARTIEL", desc: "Sélection libre — comptes individuels sans regroupement par racine", filter: null, noRoots: true },
  { id: "tva", label: "GRAND LIVRE TVA", desc: "Comptes 4456 / 4457 — TVA déductible et collectée", filter: a => a.startsWith("4456") || a.startsWith("4457"), locked: true },
  { id: "banque", label: "GRAND LIVRE BANQUE", desc: "Comptes 512 — Banques", filter: a => a.startsWith("512"), locked: true },
  { id: "charges", label: "GRAND LIVRE CHARGES", desc: "Classe 6 — Charges d'exploitation", filter: a => a.startsWith("6"), locked: true },
  { id: "produits", label: "GRAND LIVRE PRODUITS", desc: "Classe 7 — Produits / Chiffre d'affaires", filter: a => a.startsWith("7"), locked: true },
];

export default function GrandLivreComplet() {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const allAccountsInit = useMemo(() => [...new Set(INITIAL_ENTRIES.map(e=>e.account))].sort(), []);
  // Toutes les racines sont chargées par défaut
  const [loadedRoots, setLoadedRoots] = useState(() => {
    const all = new Set();
    ACCOUNT_ROOTS.forEach(r => all.add(r.number));
    return all;
  });
  // Tous les comptes de détail sont cochés
  const [checkedAccts, setCheckedAccts] = useState(() => {
    const initial = new Set();
    INITIAL_ENTRIES.forEach(e => initial.add(e.account));
    return initial;
  });
  const [fMode, setFMode] = useState("all");
  const [selIds, setSelIds] = useState(new Set());
  const [nli, setNli] = useState(0);
  const [notif, setNotif] = useState(null);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState("");
  const [centralSearch, setCentralSearch] = useState("");
  const [mainSearchInput, setMainSearchInput] = useState("");
  const [mainSearchTags, setMainSearchTags] = useState([]);
  const [collapsed, setCollapsed] = useState(new Set());
  const [expandedAccts, setExpandedAccts] = useState(new Set());
  const [acctPage, setAcctPage] = useState(0);
  const [acctPerPage, setAcctPerPage] = useState(5);
  const [entryPages, setEntryPages] = useState({});
  const entriesPerPage = 10;
  const [ledgerType, setLedgerType] = useState("global");
  const [addedRoots, setAddedRoots] = useState(new Set());
  // Tout compte racine ajouté est automatiquement centralisé
  const [centralizedRoots, setCentralizedRoots] = useState(new Set(["401","411"]));
  const [intentionalRoots, setIntentionalRoots] = useState(new Set(["401","411"]));
  const [dynamicRoots, setDynamicRoots] = useState([]);
  const [showDetail, setShowDetail] = useState(true);
  const [sidebarScrolled, setSidebarScrolled] = useState(false);

  // ── Filtre de période ──
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-12-31");
  const [monthClickPhase, setMonthClickPhase] = useState(0);
  const [monthFirstClick, setMonthFirstClick] = useState(0);

  const MONTHS = [
    {l:"Janv.",from:"2025-01-01",to:"2025-01-31"},{l:"Fév.",from:"2025-02-01",to:"2025-02-28"},
    {l:"Mars",from:"2025-03-01",to:"2025-03-31"},{l:"Avr.",from:"2025-04-01",to:"2025-04-30"},
    {l:"Mai",from:"2025-05-01",to:"2025-05-31"},{l:"Juin",from:"2025-06-01",to:"2025-06-30"},
    {l:"Juil.",from:"2025-07-01",to:"2025-07-31"},{l:"Août",from:"2025-08-01",to:"2025-08-31"},
    {l:"Sept.",from:"2025-09-01",to:"2025-09-30"},{l:"Oct.",from:"2025-10-01",to:"2025-10-31"},
    {l:"Nov.",from:"2025-11-01",to:"2025-11-30"},{l:"Déc.",from:"2025-12-01",to:"2025-12-31"},
  ];
  const selMonthStart = MONTHS.findIndex(m => m.from === dateFrom);
  const selMonthEnd = MONTHS.findIndex(m => m.to === dateTo);
  const handleMonthClick = (idx) => {
    if (monthClickPhase === 0) {
      setDateFrom(MONTHS[idx].from); setDateTo(MONTHS[idx].to);
      setMonthFirstClick(idx); setMonthClickPhase(1); setAcctPage(0);
    } else {
      const s = Math.min(monthFirstClick, idx), e = Math.max(monthFirstClick, idx);
      setDateFrom(MONTHS[s].from); setDateTo(MONTHS[e].to);
      setMonthClickPhase(0); setAcctPage(0);
    }
  };

  // Toutes les racines = statiques + dynamiques (dédupliquées)
  const allRoots = useMemo(() => {
    const map = new Map();
    ACCOUNT_ROOTS.forEach(r => map.set(r.number, r));
    dynamicRoots.forEach(r => { if (!map.has(r.number)) map.set(r.number, r); });
    return [...map.values()];
  }, [dynamicRoots]);

  const allAccounts = useMemo(() => [...new Set(entries.map(e=>e.account))].sort(), [entries]);

  const accounts = useMemo(() => {
    const lt = LEDGER_TYPES.find(t => t.id === ledgerType);

    if (lt && lt.noRoots && !search) return [];
    if (lt && lt.noRoots && search) {
      const q = search.toUpperCase();
      return allAccounts.filter(a => a.toUpperCase().includes(q) || (ACCOUNT_NAMES[a]||"").toUpperCase().includes(q));
    }

    // Seuls les enfants des racines chargées sont visibles
    const visibleAccts = new Set();
    allRoots.forEach(r => {
      if (loadedRoots.has(r.number)) {
        r.children.forEach(c => { if (allAccounts.includes(c)) visibleAccts.add(c); });
      }
    });

    let filtered = [...visibleAccts].sort();
    if (lt && lt.filter) filtered = filtered.filter(lt.filter);
    return filtered;
  }, [allAccounts, search, ledgerType, loadedRoots]);

  // En mode partiel, la recherche porte sur les comptes racines ET les comptes de détail
  const searchResults = useMemo(() => {
    const lt = LEDGER_TYPES.find(t => t.id === ledgerType);
    if (!lt || !lt.noRoots || !search) return { roots: [], details: [] };
    const q = search.toUpperCase();
    const roots = allRoots.filter(r => r.number.includes(q) || r.name.toUpperCase().includes(q));
    const details = allAccounts.filter(a => a.toUpperCase().includes(q) || (ACCOUNT_NAMES[a]||"").toUpperCase().includes(q));
    return { roots, details };
  }, [allAccounts, search, ledgerType]);

  const grouped = useMemo(() => {
    const g = {};
    accounts.forEach(a => { const c = a.charAt(0); if (!g[c]) g[c]=[]; g[c].push(a); });
    return g;
  }, [accounts]);

  const toggleCheck = (acct) => {
    const parentRoot = allRoots.find(r => r.children.includes(acct));
    if (parentRoot && !loadedRoots.has(parentRoot.number)) {
      // Charger la racine et tous ses enfants
      setLoadedRoots(prev => new Set(prev).add(parentRoot.number));
      setIntentionalRoots(prev => new Set(prev).add(parentRoot.number));
      setCheckedAccts(p => { const n = new Set(p); parentRoot.children.forEach(c => n.add(c)); return n; });
      // Centraliser si le père (la classe) a déjà des comptes chargés
      const parentCls = parentRoot.cls;
      const parentHasAccounts = [...checkedAccts].some(a => a.charAt(0) === parentCls);
      if (parentHasAccounts) {
        setCentralizedRoots(prev => new Set(prev).add(parentRoot.number));
      }
    } else {
      setCheckedAccts(p => {
        const n = new Set(p);
        if (n.has(acct)) { n.delete(acct); setExpandedAccts(prev => { const x = new Set(prev); x.delete(acct); return x; }); }
        else { n.add(acct); setExpandedAccts(prev => new Set(prev).add(acct)); }
        return n;
      });
    }
    setSelIds(new Set());
    setAcctPage(0);
  };

  const toggleClassSelect = (cls) => {
    const clsRoots = allRoots.filter(r => r.cls === cls);
    const allLoaded = clsRoots.every(r => loadedRoots.has(r.number));
    if (allLoaded) {
      // Tout retirer pour cette classe
      setLoadedRoots(p => { const n = new Set(p); clsRoots.forEach(r => n.delete(r.number)); return n; });
      setCentralizedRoots(p => { const n = new Set(p); clsRoots.forEach(r => n.delete(r.number)); return n; });
      setCheckedAccts(p => { const n = new Set(p); clsRoots.forEach(r => r.children.forEach(c => n.delete(c))); return n; });
      setExpandedAccts(p => { const n = new Set(p); clsRoots.forEach(r => r.children.forEach(c => n.delete(c))); return n; });
    } else {
      // Tout charger pour cette classe
      setLoadedRoots(p => { const n = new Set(p); clsRoots.forEach(r => n.add(r.number)); return n; });
      setCheckedAccts(p => { const n = new Set(p); clsRoots.forEach(r => r.children.forEach(c => n.add(c))); return n; });
      // Centraliser les racines seulement si la classe a déjà des comptes chargés
      const clsHasAccounts = [...checkedAccts].some(a => a.charAt(0) === cls);
      if (clsHasAccounts) {
        setCentralizedRoots(p => { const n = new Set(p); clsRoots.forEach(r => n.add(r.number)); return n; });
      }
    }
    setSelIds(new Set());
  };

  const toggleExpand = (acct) => {
    setExpandedAccts(p => { const n = new Set(p); if (n.has(acct)) n.delete(acct); else n.add(acct); return n; });
  };

  // Filtrer les écritures par période
  const filteredEntries = useMemo(() => {
    let fe = entries;
    if (dateFrom) fe = fe.filter(e => e.date >= dateFrom);
    if (dateTo) fe = fe.filter(e => e.date <= dateTo);
    return fe;
  }, [entries, dateFrom, dateTo]);

  const multiTots = useMemo(() => {
    const all = filteredEntries.filter(e => checkedAccts.has(e.account));
    const d = all.reduce((s,e) => s+e.debit, 0), c = all.reduce((s,e) => s+e.credit, 0);
    return { d, c, solde: d-c, um: all.filter(e=>!e.lettre).length, m: all.filter(e=>!!e.lettre).length, t: all.length, accts: checkedAccts.size };
  }, [filteredEntries, checkedAccts]);

  const toggle = useCallback(id => { setSelIds(p => { const n=new Set(p); if(n.has(id))n.delete(id);else n.add(id); return n; }); }, []);
  const notify = (msg,type="success") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3500); };

  const doLettre = () => {
    if (selIds.size<2) { notify("Sélectionnez au moins 2 écritures.","error"); return; }
    const sel=filteredEntries.filter(e=>selIds.has(e.id));
    if (sel.some(e=>e.lettre)) { notify("Certaines écritures sont déjà lettrées.","error"); return; }
    const accts = new Set(sel.map(e=>e.account));
    if (accts.size > 1) { notify("Le lettrage doit être sur un seul compte.","error"); return; }
    const diff=Math.abs(sel.reduce((s,e)=>s+e.debit,0)-sel.reduce((s,e)=>s+e.credit,0));
    if (diff>0.01) { notify(`Écart de ${fmt(diff)} € — Débits ≠ Crédits.`,"error"); return; }
    const l=NEXT_L[nli%NEXT_L.length];
    setEntries(p=>p.map(e=>selIds.has(e.id)?{...e,lettre:l}:e));
    setNli(i=>i+1); setSelIds(new Set());
    notify(`Lettrage ${l} appliqué à ${sel.length} écritures.`);
  };

  const doDelettrer = () => {
    if (!selIds.size) { notify("Sélectionnez une écriture lettrée.","error"); return; }
    const ls=[...new Set(filteredEntries.filter(e=>selIds.has(e.id)).map(e=>e.lettre).filter(Boolean))];
    if (!ls.length) { notify("Aucune écriture lettrée sélectionnée.","error"); return; }
    setEntries(p=>p.map(e=>ls.includes(e.lettre)?{...e,lettre:""}:e));
    setSelIds(new Set()); notify(`Délettrage : ${ls.join(", ")}.`);
  };

  const sb = useMemo(() => {
    const sel=filteredEntries.filter(e=>selIds.has(e.id));
    const d=sel.reduce((s,e)=>s+e.debit,0),c=sel.reduce((s,e)=>s+e.credit,0);
    return {d,c,diff:d-c};
  }, [entries, selIds]);

  return (
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:"#f0ede6",height:"100vh",color:"#1c1917",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      {/* Header */}
      <div style={{background:"#1c1917",color:"#faf9f6",padding:"14px 22px",borderBottom:"3px solid #c9a227",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,borderRadius:7,background:"linear-gradient(135deg,#c9a227,#e8d48b)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#1c1917"}}>SU</div>
          <div><div style={{fontSize:14,fontWeight:700}}>Grand Livre — Lettrage interactif</div><div style={{fontSize:10,color:"#a8a29e",marginTop:1}}>Stairling Union · Exercice 2025 · {LEDGER_TYPES.find(t=>t.id===ledgerType)?.label}</div></div>
        </div>
        <button onClick={()=>setHelp(!help)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",borderRadius:6,padding:"4px 11px",cursor:"pointer",fontSize:11}}>{help?"✕":"? Aide"}</button>
      </div>
      {help&&<div style={{background:"#fffbeb",border:"1px solid #f9e79f",margin:"10px 14px 0",borderRadius:7,padding:"10px 14px",fontSize:11,lineHeight:1.6}}>
        <strong>Lettrage :</strong> cochez facture + règlement (même compte tiers), vérifiez écart = 0 €, cliquez « Lettrer ». <strong>Délettrer :</strong> sélectionnez et cliquez « Délettrer ». <strong>Filtres :</strong> « Non lettrées » = factures impayées.
      </div>}

      <div style={{display:"flex",flex:1,minHeight:0}}>
        {/* Sidebar */}
        <div style={{width:270,minWidth:270,background:"#faf9f6",borderRight:"1px solid #d6d0c4",display:"flex",flexDirection:"column",overflow:"hidden",height:"100%"}}>
          <div style={{padding:"10px 12px 4px",flexShrink:0}}>
            <select value={ledgerType} onChange={e=>{
              const newType = e.target.value;
              setLedgerType(newType); setSearch(""); setCollapsed(new Set()); setAcctPage(0);
              const lt = LEDGER_TYPES.find(t=>t.id===newType);
              if (lt && lt.noRoots) {
                setCheckedAccts(new Set()); setExpandedAccts(new Set()); setAddedRoots(new Set());
                setCentralizedRoots(new Set()); setLoadedRoots(new Set()); setIntentionalRoots(new Set());
              } else if (lt && lt.filter) {
                const matchingRoots = new Set(); const filtered = new Set();
                allRoots.forEach(r => {
                  const mc = r.children.filter(c => allAccounts.includes(c) && lt.filter(c));
                  if (mc.length > 0) { matchingRoots.add(r.number); mc.forEach(c => filtered.add(c)); }
                });
                setLoadedRoots(matchingRoots); setCheckedAccts(filtered); setCentralizedRoots(new Set());
                setIntentionalRoots(matchingRoots); setExpandedAccts(new Set());
              } else {
                const lr = new Set(); const lc = new Set();
                allRoots.forEach(r => { lr.add(r.number); r.children.forEach(c => { if (allAccounts.includes(c)) lc.add(c); }); });
                setLoadedRoots(lr); setCheckedAccts(lc); setExpandedAccts(new Set());
                setCentralizedRoots(new Set(["401","411"])); setIntentionalRoots(new Set(["401","411"]));
              }
              setSelIds(new Set());
            }}
              style={{width:"100%",padding:"8px 10px",borderRadius:6,border:"1.5px solid #c9a227",fontSize:11,fontWeight:700,fontFamily:"inherit",background:"#fff",color:"#1c1917",cursor:"pointer",boxSizing:"border-box",marginBottom:8}}>
              {LEDGER_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div style={{fontSize:9,color:"#a8a29e",marginBottom:6,padding:"0 2px",lineHeight:1.3}}>{LEDGER_TYPES.find(t=>t.id===ledgerType)?.desc}</div>
            {/* Toggle affichage comptes de détail */}
            <div onClick={()=>setShowDetail(d=>!d)}
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 8px",marginBottom:8,borderRadius:5,
                border:`1px solid ${showDetail?"#c9a227":"#d6d0c4"}`,background:showDetail?"#c9a22708":"transparent",cursor:"pointer",transition:"all 0.15s"}}>
              <span style={{fontSize:10,fontWeight:600,color:showDetail?"#1c1917":"#a8a29e"}}>Afficher comptes détaillés</span>
              <div style={{width:30,height:16,borderRadius:8,background:showDetail?"#c9a227":"#d6d0c4",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{width:12,height:12,borderRadius:6,background:"#fff",position:"absolute",top:2,left:showDetail?16:2,transition:"left 0.2s"}}/>
              </div>
            </div>
            {/* Champ 1 — Ajouter un compte (verrouillé sauf partiel) */}
            {LEDGER_TYPES.find(t=>t.id===ledgerType)?.locked ? (
              <div style={{padding:"5px 8px",borderRadius:5,background:"#f5f3ee",border:"1px solid #e8e4db",marginBottom:6,
                display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:10}}>🔒</span>
                <span style={{fontSize:9,color:"#a8a29e"}}>Ajout de comptes verrouillé</span>
              </div>
            ) : (
            <div style={{position:"relative",marginBottom:6}}>
              <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,color:"#78716c",marginBottom:3}}>Ajouter un compte</div>
              <input type="text" placeholder="Ex : 101000, 512000…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1.5px solid ${search?"#16a34a":"#d6d0c4"}`,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
              {search && (()=>{
                const q = search.toUpperCase().trim(); if (!q) return null;
                const allPrefixes = new Map();
                allRoots.forEach(r => { allPrefixes.set(r.number, { number: r.number, name: r.name, cls: r.cls, children: r.children.filter(c=>allAccounts.includes(c)), defined: true }); });
                Object.entries(ACCOUNT_CLASSES).forEach(([k, v]) => { const ca = allAccounts.filter(a => a.charAt(0) === k); if (ca.length > 0) allPrefixes.set(k, { number: k, name: v.label.toUpperCase(), cls: k, children: ca, defined: true }); });
                allAccounts.forEach(acct => { for (let len = 2; len < acct.length; len++) { const pf = acct.substring(0, len); if (!allPrefixes.has(pf) && /^\d+$/.test(pf)) { const pa = allAccounts.filter(a => a.startsWith(pf)); if (pa.length > 0) { const pr = allRoots.find(r => r.number.startsWith(pf) || pf.startsWith(r.number)); allPrefixes.set(pf, { number: pf, name: pr ? pr.name : `COMPTES ${pf}`, cls: pf.charAt(0), children: pa, defined: false }); } } } });
                const mp = [...allPrefixes.values()].filter(p => p.number.startsWith(q) || p.name.toUpperCase().includes(q)).sort((a, b) => a.number.localeCompare(b.number));
                const md = allAccounts.filter(a => a.toUpperCase().startsWith(q) || (ACCOUNT_NAMES[a]||"").toUpperCase().includes(q));
                const sp = new Set(mp.map(p => p.number));
                const fd = md.filter(a => !sp.has(a));
                if (mp.length === 0 && fd.length === 0) return (<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#fff",border:"1px solid #d6d0c4",borderTop:"none",borderRadius:"0 0 6px 6px",padding:"10px",fontSize:10,color:"#a8a29e",fontStyle:"italic",textAlign:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>Aucun compte trouvé pour « {search} »</div>);
                return (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#fff",border:"1.5px solid #16a34a",borderTop:"none",borderRadius:"0 0 6px 6px",maxHeight:200,overflowY:"auto",boxShadow:"0 6px 16px rgba(0,0,0,0.12)"}}>
                    {mp.map(p => {
                      const clr = (ACCOUNT_CLASSES[p.cls]||{color:"#78716c"}).color;
                      const isClass = p.number.length === 1;
                      const isDR = allRoots.some(r => r.number === p.number);
                      const allAdded = isDR ? intentionalRoots.has(p.number) : isClass ? allRoots.filter(r => r.cls === p.number).every(r => intentionalRoots.has(r.number)) && allRoots.some(r => r.cls === p.number) : allRoots.filter(r => r.number.startsWith(p.number)).every(r => intentionalRoots.has(r.number)) && allRoots.some(r => r.number.startsWith(p.number));
                      return (
                        <div key={`p_${p.number}`} onClick={()=>{
                          setCheckedAccts(prev => { const n = new Set(prev); p.children.forEach(c => n.add(c)); return n; });
                          setExpandedAccts(prev => { const n = new Set(prev); p.children.forEach(c => n.add(c)); return n; });
                          if (p.number.length > 1) {
                            const er = allRoots.find(r => r.number === p.number);
                            if (er) { setLoadedRoots(prev => new Set(prev).add(er.number)); setIntentionalRoots(prev => new Set(prev).add(er.number)); }
                            else { const cr = allRoots.filter(r => r.number.startsWith(p.number)); if (cr.length > 0) { cr.forEach(r => { setLoadedRoots(prev => new Set(prev).add(r.number)); setIntentionalRoots(prev => new Set(prev).add(r.number)); }); } else if (p.children.length > 0) { setDynamicRoots(prev => { if (prev.some(r => r.number === p.number)) return prev; return [...prev, { number: p.number, name: p.name, cls: p.cls, children: p.children }]; }); setLoadedRoots(prev => new Set(prev).add(p.number)); setIntentionalRoots(prev => new Set(prev).add(p.number)); } }
                            const pCls = p.number.charAt(0); const pHas = [...checkedAccts].some(a => a.charAt(0) === pCls);
                            if (pHas) { const eRoot = allRoots.find(r => r.number === p.number); if (eRoot) setCentralizedRoots(prev => new Set(prev).add(eRoot.number)); else { const crs = allRoots.filter(r => r.number.startsWith(p.number)); setCentralizedRoots(prev => { const n = new Set(prev); crs.forEach(r => n.add(r.number)); return n; }); } }
                          } else { const crs = allRoots.filter(r => r.cls === p.number); setLoadedRoots(prev => { const n = new Set(prev); crs.forEach(r => n.add(r.number)); return n; }); }
                          setSelIds(new Set()); setSearch("");
                        }}
                          style={{padding:"6px 10px",cursor:allAdded?"default":"pointer",borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                          onMouseEnter={e=>{if(!allAdded)e.currentTarget.style.background="#f0fdf4"}}
                          onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:clr,marginRight:6}}>{p.number}</span>
                              <span style={{fontSize:10,color:"#57534e"}}>{p.name}</span>
                            </div>
                            <span style={{fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,
                              background:allAdded?"#f5f3ee":isDR?"#c9a22720":"#dcfce7",
                              color:allAdded?"#a8a29e":isDR?"#8b6914":"#16a34a"}}>{allAdded?"Ajouté":isDR?"Racine":isClass?"Classe":"Compte"}</span>
                          </div>
                        </div>);
                    })}
                    {fd.length > 0 && (<div style={{borderTop:"2px solid #e8e4db"}}>
                      <div style={{padding:"4px 10px",fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.6,color:"#a8a29e",background:"#f5f3ee"}}>Comptes de détail</div>
                      {fd.map(a => { const already = checkedAccts.has(a); const clr = (ACCOUNT_CLASSES[a.charAt(0)]||{color:"#78716c"}).color;
                        return (<div key={a} onClick={()=>{toggleCheck(a); setSearch("");}} style={{padding:"6px 10px",cursor:"pointer",borderBottom:"0.5px solid #f0ece3"}} onMouseEnter={e=>{if(!already)e.currentTarget.style.background="#f0fdf4"}} onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div><span style={{fontFamily:"monospace",fontSize:11,fontWeight:600,color:clr,marginRight:6}}>{a}</span><span style={{fontSize:9,color:"#a8a29e"}}>{ACCOUNT_NAMES[a]||""}</span></div>
                            <span style={{fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,background:already?"#f5f3ee":"#dcfce7",color:already?"#a8a29e":"#16a34a"}}>{already?"✓":"Détail"}</span>
                          </div></div>);
                      })}</div>)}
                  </div>);
              })()}
            </div>
            )}
            {/* Champ 2 — Centraliser un compte */}
            <div style={{position:"relative",marginBottom:2}}>
              <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,color:"#78716c",marginBottom:3}}>Centraliser un compte</div>
              <input type="text" placeholder="Ex : 1, 218, 401…" value={centralSearch} onChange={e=>setCentralSearch(e.target.value)}
                style={{width:"100%",padding:"6px 10px",borderRadius:6,border:`1.5px solid ${centralSearch?"#c9a227":"#d6d0c4"}`,fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
              {centralSearch && (()=>{
                const q = centralSearch.toUpperCase().trim(); if (!q) return null;
                // Suggestions : racines et préfixes intermédiaires uniquement (pas les comptes de détail)
                const suggestions = [];
                allRoots.forEach(r => {
                  if (r.number.startsWith(q) || r.name.toUpperCase().includes(q)) {
                    const nbChildren = r.children.filter(c => allAccounts.includes(c)).length;
                    if (nbChildren > 0) suggestions.push({ number: r.number, name: r.name, cls: r.cls, children: r.children.filter(c=>allAccounts.includes(c)), nbChildren });
                  }
                });
                // Préfixes intermédiaires
                const prefixes = new Set();
                allAccounts.forEach(acct => { for (let len = 1; len < acct.length; len++) { const pf = acct.substring(0, len); if (/^\d+$/.test(pf) && pf.startsWith(q) && !allRoots.some(r => r.number === pf)) prefixes.add(pf); } });
                prefixes.forEach(pf => {
                  const pa = allAccounts.filter(a => a.startsWith(pf));
                  if (pa.length > 0 && !suggestions.some(s => s.number === pf)) {
                    const pr = allRoots.find(r => pf.startsWith(r.number));
                    suggestions.push({ number: pf, name: pr ? pr.name : `COMPTES ${pf}`, cls: pf.charAt(0), children: pa, nbChildren: pa.length });
                  }
                });
                suggestions.sort((a, b) => a.number.localeCompare(b.number));
                if (suggestions.length === 0) return (<div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#fff",border:"1px solid #d6d0c4",borderRadius:"0 0 6px 6px",padding:"10px",fontSize:10,color:"#a8a29e",fontStyle:"italic",textAlign:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.1)"}}>Aucun compte à centraliser pour « {centralSearch} »</div>);
                return (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:10,background:"#fff",border:"1.5px solid #c9a227",borderTop:"none",borderRadius:"0 0 6px 6px",maxHeight:200,overflowY:"auto",boxShadow:"0 6px 16px rgba(0,0,0,0.12)"}}>
                    {suggestions.map(s => {
                      const clr = (ACCOUNT_CLASSES[s.cls]||{color:"#78716c"}).color;
                      const alreadyCent = centralizedRoots.has(s.number);
                      return (
                        <div key={s.number} onClick={()=>{
                          // Ajouter comme racine intentionnelle et centraliser
                          const er = allRoots.find(r => r.number === s.number);
                          if (er) { setLoadedRoots(prev => new Set(prev).add(er.number)); setIntentionalRoots(prev => new Set(prev).add(er.number)); }
                          else { setDynamicRoots(prev => { if (prev.some(r => r.number === s.number)) return prev; return [...prev, { number: s.number, name: s.name, cls: s.cls, children: s.children }]; }); setLoadedRoots(prev => new Set(prev).add(s.number)); setIntentionalRoots(prev => new Set(prev).add(s.number)); }
                          setCentralizedRoots(prev => new Set(prev).add(s.number));
                          setCheckedAccts(prev => { const n = new Set(prev); s.children.forEach(c => n.add(c)); return n; });
                          setCentralSearch("");
                        }}
                          style={{padding:"6px 10px",cursor:alreadyCent?"default":"pointer",borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                          onMouseEnter={e=>{if(!alreadyCent)e.currentTarget.style.background="#fffbeb"}}
                          onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div>
                              <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:clr,marginRight:6}}>{s.number}</span>
                              <span style={{fontSize:10,color:"#57534e"}}>{s.name}</span>
                              <span style={{fontSize:8,color:"#a8a29e",marginLeft:4}}>({s.nbChildren} comptes)</span>
                            </div>
                            <span style={{fontSize:8,fontWeight:600,padding:"1px 5px",borderRadius:3,
                              background:alreadyCent?"#c9a227":"#c9a22720",color:alreadyCent?"#fff":"#8b6914"}}>{alreadyCent?"Centralisé":"Centraliser"}</span>
                          </div>
                        </div>);
                    })}
                  </div>);
              })()}
            </div>
          </div>

          {/* Compteur + boutons */}
          <div style={{padding:"4px 12px 6px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4,flexShrink:0}}>
            <span style={{fontSize:9,color:"#78716c",fontWeight:600}}>{[...checkedAccts].filter(a => accounts.includes(a)).length} / {accounts.length}</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{
                const allKeys = new Set();
                const isGlob = ledgerType === "global";
                if (isGlob) { [...new Set(accounts.map(a => a.charAt(0)))].forEach(cls => allKeys.add(`cls_${cls}`)); }
                else { allRoots.forEach(r => { if (r.children.some(c => accounts.includes(c))) allKeys.add(r.number); }); }
                setCollapsed(p => { const ae = [...allKeys].every(k => !p.has(k)); return ae ? new Set(allKeys) : new Set(); });
              }} style={{fontSize:9,color:"#0891b2",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>
                {(()=>{
                  const ak = []; const isGlob = ledgerType === "global";
                  if (isGlob) { [...new Set(accounts.map(a => a.charAt(0)))].forEach(cls => ak.push(`cls_${cls}`)); }
                  else { allRoots.forEach(r => { if (r.children.some(c => accounts.includes(c))) ak.push(r.number); }); }
                  return ak.every(k => !collapsed.has(k)) ? "▶ Replier" : "▼ Déplier";
                })()}
              </button>
              {[...checkedAccts].filter(a=>accounts.includes(a)).length < accounts.length && (
                <button onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);accounts.forEach(a=>n.add(a));return n;});setAcctPage(0);}}
                  style={{fontSize:9,color:"#16a34a",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>Tout cocher</button>
              )}
              {[...checkedAccts].filter(a=>accounts.includes(a)).length > 0 && (
                <button onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);accounts.forEach(a=>n.delete(a));return n;});setAcctPage(0);}}
                  style={{fontSize:9,color:"#dc2626",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>Tout décocher</button>
              )}
            </div>
          </div>

          {/* ── ZONE SCROLLABLE — Arbre comptes ── */}
          <div onScroll={e => setSidebarScrolled(e.target.scrollTop > 0)}
            style={{flex:1,overflowY:"auto",padding:"0 5px 10px",borderTop:sidebarScrolled?"1px solid #d6d0c4":"1px solid transparent",
              boxShadow:sidebarScrolled?"inset 0 2px 4px rgba(0,0,0,0.06)":"none",transition:"all 0.15s",minHeight:0}}>
            {(()=>{
              const lt = LEDGER_TYPES.find(t => t.id === ledgerType);
              const isTiers = lt && lt.filter && ["fournisseurs","clients","tiers"].includes(lt.id);

              if (lt && lt.noRoots) {
                if (checkedAccts.size === 0) return (<div style={{padding:"20px 8px",fontSize:11,color:"#a8a29e",fontStyle:"italic",textAlign:"center"}}>Tapez un numéro pour rechercher.</div>);
                // En mode partiel : afficher racines intentionnelles puis orphelins (pas de classes)
                // Trier du plus spécifique au plus général pour éviter les doublons
                const sortedIntRoots = allRoots.filter(r => intentionalRoots.has(r.number)).sort((a,b) => b.number.length - a.number.length);
                const acctToRoot = new Map(); // account → root number (le plus spécifique)
                sortedIntRoots.forEach(r => {
                  r.children.forEach(c => { if (checkedAccts.has(c) && !acctToRoot.has(c)) acctToRoot.set(c, r.number); });
                });
                const rootGroups = [];
                // Reconstruire dans l'ordre alphabétique, chaque racine avec seulement ses enfants effectifs
                allRoots.filter(r => intentionalRoots.has(r.number)).sort((a,b) => a.number.localeCompare(b.number)).forEach(r => {
                  const effectiveChildren = r.children.filter(c => acctToRoot.get(c) === r.number);
                  // Toujours inclure la racine même sans enfants directs (elle peut avoir des sous-racines)
                  rootGroups.push({ ...r, activeChildren: effectiveChildren });
                });
                const intentionalAssigned = new Set(acctToRoot.keys());
                const orphans = [...checkedAccts].filter(a => !intentionalAssigned.has(a)).sort();
                // Séparer les racines en parentes et enfants
                const intRoots = rootGroups.sort((a,b) => a.number.localeCompare(b.number));
                const parentRoots = intRoots.filter(r => !intRoots.some(p => p.number !== r.number && r.number.startsWith(p.number)));
                const childRootsOf = (parentNum) => intRoots.filter(r => r.number !== parentNum && r.number.startsWith(parentNum));

                const renderPartielRoot = (r, depth) => {
                  const subRoots = childRootsOf(r.number);
                  const subRootAccts = new Set();
                  subRoots.forEach(sr => sr.activeChildren.forEach(c => subRootAccts.add(c)));
                  const directChildren = r.activeChildren.filter(c => !subRootAccts.has(c));
                  const clr = (ACCOUNT_CLASSES[r.cls]||{color:"#78716c"}).color;
                  const isCol = collapsed.has(r.number);
                  const isCent = centralizedRoots.has(r.number);
                  return (
                    <div key={r.number} style={{marginBottom:2,marginLeft:depth>0?depth*8:0}}>
                      <div style={{padding:"6px 9px",display:"flex",alignItems:"center",gap:5,borderRadius:5,fontSize:10,fontWeight:700,
                        color:clr,background:`${clr}15`,userSelect:"none",borderLeft:`3px solid ${clr}`,transition:"all 0.12s"}}>
                        <span onClick={()=>{setCollapsed(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;})}}
                          style={{fontSize:8,transition:"transform 0.15s",transform:isCol?"rotate(-90deg)":"rotate(0)",cursor:"pointer",padding:"2px"}}>▼</span>
                        <span style={{flex:1}}>
                          <span style={{fontFamily:"monospace",fontWeight:800,marginRight:5}}>{r.number}</span>{r.name}
                        </span>
                        <span onClick={(ev)=>{ev.stopPropagation();setCentralizedRoots(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;})}}
                          style={{fontSize:7,padding:"1px 5px",borderRadius:3,cursor:"pointer",fontWeight:700,background:isCent?"#c9a227":"transparent",color:isCent?"#fff":"#a8a29e",border:`1px solid ${isCent?"#c9a227":"#d6d0c4"}`,transition:"all 0.15s"}} title={isCent?"Désactiver centralisation":"Centraliser"}>C</span>
                        <span onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);r.children.forEach(c=>n.delete(c));return n;});setIntentionalRoots(p=>{const n=new Set(p);n.delete(r.number);return n;});setCentralizedRoots(p=>{const n=new Set(p);n.delete(r.number);return n;});}}
                          style={{fontSize:9,color:"#dc2626",cursor:"pointer",padding:"0 4px"}} title="Retirer">✕</span>
                      </div>
                      {!isCol && showDetail && directChildren.map(a => {
                        const active = checkedAccts.has(a); const um = filteredEntries.filter(e=>e.account===a&&!e.lettre).length;
                        return (<div key={a} onClick={()=>toggleCheck(a)}
                          style={{padding:"5px 9px 5px 24px",cursor:"pointer",borderRadius:3,marginTop:1,
                            background:active?`${clr}12`:"transparent",borderLeft:active?`3px solid ${clr}`:"3px solid transparent",opacity:isCent?0.6:1,transition:"all 0.1s"}}
                          onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}}
                          onMouseLeave={e=>{e.currentTarget.style.background=active?`${clr}12`:"transparent"}}>
                          <div style={{fontSize:11,fontWeight:active?700:500,color:active?clr:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                            {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                          </div>
                          <div style={{fontSize:9,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                        </div>);
                      })}
                      {!isCol && subRoots.map(sr => renderPartielRoot(sr, depth + 1))}
                    </div>);
                };

                return (<div>
                  {parentRoots.map(r => renderPartielRoot(r, 0))}
                  {orphans.map(a => {
                    const clr = (ACCOUNT_CLASSES[a.charAt(0)]||{color:"#78716c"}).color;
                    const active = checkedAccts.has(a); const um = filteredEntries.filter(e=>e.account===a&&!e.lettre).length;
                    return (<div key={a} onClick={()=>toggleCheck(a)}
                      style={{padding:"5px 9px",cursor:"pointer",borderRadius:3,marginTop:1,
                        background:active?`${clr}12`:"transparent",borderLeft:active?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.1s"}}
                      onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}}
                      onMouseLeave={e=>{e.currentTarget.style.background=active?`${clr}12`:"transparent"}}>
                      <div style={{fontSize:11,fontWeight:active?700:500,color:active?clr:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                        {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                      </div>
                      <div style={{fontSize:9,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                    </div>);
                  })}
                </div>);
              }

              if (isTiers) {
                const rootGroups = []; allRoots.forEach(r => { const ch = r.children.filter(c => accounts.includes(c)); if (ch.length > 0) rootGroups.push({ ...r, visibleChildren: ch }); });
                return rootGroups.map(r => {
                  const clr = (ACCOUNT_CLASSES[r.cls]||{color:"#78716c"}).color;
                  const isCol = collapsed.has(r.number);
                  const rC = r.visibleChildren.filter(a => checkedAccts.has(a)).length;
                  const allRC = rC === r.visibleChildren.length;
                  return (<div key={r.number} style={{marginBottom:2}}>
                    <div style={{padding:"6px 9px",display:"flex",alignItems:"center",gap:5,borderRadius:5,fontSize:10,fontWeight:700,color:clr,background:allRC?`${clr}15`:`${clr}08`,userSelect:"none",borderLeft:allRC?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.12s"}}>
                      <span onClick={()=>{setCollapsed(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;})}} style={{fontSize:8,transition:"transform 0.15s",transform:isCol?"rotate(-90deg)":"rotate(0)",cursor:"pointer",padding:"2px"}}>▼</span>
                      <span onClick={()=>{setCheckedAccts(p=>{const n=new Set(p);r.visibleChildren.forEach(c=>{if(allRC)n.delete(c);else n.add(c);});return n;});setAcctPage(0);}} style={{cursor:"pointer",flex:1}}>
                        <span style={{fontFamily:"monospace",fontWeight:800,marginRight:5}}>{r.number}</span>{r.name}</span>
                      <span style={{fontSize:9,opacity:0.6}}>{rC>0&&<span style={{color:clr,fontWeight:800}}>{rC}/</span>}{r.visibleChildren.length}</span>
                    </div>
                    {!isCol && showDetail && r.visibleChildren.map(a => {
                      const active = checkedAccts.has(a); const um = filteredEntries.filter(e=>e.account===a&&!e.lettre).length;
                      return (<div key={a} onClick={()=>toggleCheck(a)} style={{padding:"5px 9px 5px 24px",cursor:"pointer",borderRadius:3,marginTop:1,background:active?`${clr}12`:"transparent",borderLeft:active?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.1s"}} onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}} onMouseLeave={e=>{e.currentTarget.style.background=active?`${clr}12`:"transparent"}}>
                        <div style={{fontSize:11,fontWeight:active?700:500,color:active?clr:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                          {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                        </div>
                        <div style={{fontSize:9,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                      </div>);
                    })}
                  </div>);
                });
              }

              // Mode global : classes → racines intentionnelles (avec C/✕) → orphelins
              const classKeys = [...new Set(accounts.map(a => a.charAt(0)))].sort();
              return classKeys.map(cls => {
                const clsMeta = ACCOUNT_CLASSES[cls] || { label: `Classe ${cls}`, color: "#78716c" };
                const isCol = collapsed.has(`cls_${cls}`);
                const clsAccts = accounts.filter(a => a.charAt(0) === cls);
                const clsChecked = clsAccts.filter(a => checkedAccts.has(a)).length;
                const allClsChecked = clsChecked === clsAccts.length && clsAccts.length > 0;
                const clsRoots = allRoots.filter(r => r.cls === cls && r.children.some(c => clsAccts.includes(c)));
                const intentionalAssigned = new Set();
                // Trier les racines intentionnelles du plus spécifique au plus général
                const sortedIntRoots = clsRoots.filter(r => intentionalRoots.has(r.number)).sort((a,b) => b.number.length - a.number.length);
                sortedIntRoots.forEach(r => { r.children.forEach(c => { if (clsAccts.includes(c)) intentionalAssigned.add(c); }); });
                const clsOrphans = clsAccts.filter(a => !intentionalAssigned.has(a));
                // Pour chaque racine, calculer ses enfants effectifs (excluant ceux assignés à une racine enfant plus spécifique)
                const childAssignedToSubRoot = new Map(); // account → root number (le plus spécifique)
                sortedIntRoots.forEach(r => { r.children.forEach(c => { if (clsAccts.includes(c) && !childAssignedToSubRoot.has(c)) childAssignedToSubRoot.set(c, r.number); }); });
                return (
                  <div key={cls} style={{marginBottom:2}}>
                    <div style={{padding:"6px 9px",display:"flex",alignItems:"center",gap:5,borderRadius:5,fontSize:10,fontWeight:700,
                      color:clsMeta.color,background:allClsChecked?`${clsMeta.color}15`:`${clsMeta.color}08`,userSelect:"none",
                      borderLeft:allClsChecked?`3px solid ${clsMeta.color}`:"3px solid transparent",transition:"all 0.12s"}}>
                      <span onClick={()=>{setCollapsed(p=>{const n=new Set(p);const k=`cls_${cls}`;if(n.has(k))n.delete(k);else n.add(k);return n;})}}
                        style={{fontSize:8,transition:"transform 0.15s",transform:isCol?"rotate(-90deg)":"rotate(0)",cursor:"pointer",padding:"2px"}}>▼</span>
                      <span onClick={()=>toggleClassSelect(cls)} style={{cursor:"pointer",flex:1}}>
                        <span style={{fontWeight:800,marginRight:4}}>{cls}</span> — {clsMeta.label.toUpperCase()}
                      </span>
                      <span style={{fontSize:9,opacity:0.6}}>{clsChecked>0&&<span style={{color:clsMeta.color,fontWeight:800}}>{clsChecked}/</span>}{clsAccts.length}</span>
                    </div>
                    {!isCol && (<>
                      {(()=>{
                        // Séparer les racines en parentes et enfants
                        const intRoots = clsRoots.filter(r => intentionalRoots.has(r.number)).sort((a,b) => a.number.localeCompare(b.number));
                        // Une racine est "enfant" si une autre racine intentionnelle est son préfixe
                        const parentRoots = intRoots.filter(r => !intRoots.some(p => p.number !== r.number && r.number.startsWith(p.number)));
                        const childRootsOf = (parentNum) => intRoots.filter(r => r.number !== parentNum && r.number.startsWith(parentNum));
                        
                        const renderRoot = (r, depth) => {
                          const subRoots = childRootsOf(r.number);
                          const subRootAccts = new Set();
                          subRoots.forEach(sr => sr.children.forEach(c => { if (clsAccts.includes(c)) subRootAccts.add(c); }));
                          const directChildren = r.children.filter(c => clsAccts.includes(c) && !subRootAccts.has(c));
                          const isCent = centralizedRoots.has(r.number);
                          return (
                            <div key={r.number} style={{marginLeft: depth * 8}}>
                              <div style={{padding:"3px 9px",display:"flex",alignItems:"center",gap:4,fontSize:9,color:isCent?clsMeta.color:"#78716c",marginTop:2}}>
                                <span style={{fontFamily:"monospace",fontWeight:700,fontSize:9}}>{r.number}</span>
                                <span style={{flex:1,fontSize:9}}>{r.name}</span>
                                <span onClick={(ev)=>{ev.stopPropagation();setCentralizedRoots(p=>{const n=new Set(p);if(n.has(r.number))n.delete(r.number);else n.add(r.number);return n;})}}
                                  style={{fontSize:7,padding:"1px 5px",borderRadius:3,cursor:"pointer",fontWeight:700,background:isCent?"#c9a227":"transparent",color:isCent?"#fff":"#a8a29e",border:`1px solid ${isCent?"#c9a227":"#d6d0c4"}`,transition:"all 0.15s"}} title={isCent?"Désactiver centralisation":"Centraliser"}>C</span>
                                <span onClick={(ev)=>{ev.stopPropagation();setIntentionalRoots(p=>{const n=new Set(p);n.delete(r.number);return n;});setCentralizedRoots(p=>{const n=new Set(p);n.delete(r.number);return n;});}}
                                  style={{fontSize:9,padding:"0px 4px",borderRadius:3,cursor:"pointer",color:"#dc2626"}} title="Retirer">✕</span>
                              </div>
                              {showDetail && directChildren.map(a => {
                                const active = checkedAccts.has(a); const um = filteredEntries.filter(e=>e.account===a&&!e.lettre).length;
                                return (<div key={a} onClick={()=>toggleCheck(a)}
                                  style={{padding:"4px 9px 4px "+(16+depth*8)+"px",cursor:"pointer",borderRadius:3,marginTop:1,background:active?`${clsMeta.color}12`:"transparent",borderLeft:active?`3px solid ${clsMeta.color}`:"3px solid transparent",opacity:isCent?0.6:1,transition:"all 0.1s"}}
                                  onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}} onMouseLeave={e=>{e.currentTarget.style.background=active?`${clsMeta.color}12`:"transparent"}}>
                                  <div style={{fontSize:10,fontWeight:active?700:500,color:active?clsMeta.color:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                    <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                                    {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                                  </div>
                                  <div style={{fontSize:8,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                                </div>);
                              })}
                              {subRoots.map(sr => renderRoot(sr, depth + 1))}
                            </div>);
                        };
                        return parentRoots.map(r => renderRoot(r, 1));
                      })()}
                      {showDetail && clsOrphans.map(a => {
                        const active = checkedAccts.has(a); const clr = clsMeta.color;
                        const um = filteredEntries.filter(e=>e.account===a&&!e.lettre).length;
                        return (<div key={a} onClick={()=>toggleCheck(a)}
                          style={{padding:"5px 9px 5px 24px",cursor:"pointer",borderRadius:3,marginTop:1,background:active?`${clr}12`:"transparent",borderLeft:active?`3px solid ${clr}`:"3px solid transparent",transition:"all 0.1s"}}
                          onMouseEnter={e=>{if(!active)e.currentTarget.style.background="#f5f5f0"}} onMouseLeave={e=>{e.currentTarget.style.background=active?`${clr}12`:"transparent"}}>
                          <div style={{fontSize:11,fontWeight:active?700:500,color:active?clr:"#1c1917",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontFamily:"monospace",fontSize:10}}>{a}</span>
                            {um>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:8,fontWeight:700,padding:"1px 4px",borderRadius:7}}>{um}</span>}
                          </div>
                          <div style={{fontSize:9,color:"#a8a29e",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ACCOUNT_NAMES[a]||a}</div>
                        </div>);
                      })}
                    </>)}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* ── ZONE FIXE : KPI + Période + Contrôles ── */}
          <div style={{flexShrink:0,padding:"14px 18px 0",background:"#f0ede6"}}>

          {checkedAccts.size === 0 && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"200px",color:"#a8a29e",fontSize:13,fontStyle:"italic",textAlign:"center",padding:40}}>
              Utilisez la barre de recherche pour ajouter un compte racine (401, 411, 7061…)
              <br/>ou sélectionnez un type de grand livre spécialisé (Fournisseurs, Clients…).
            </div>
          )}

          {checkedAccts.size > 0 && (
            <div>
              {/* Summary — au-dessus de la période */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>
                {[{l:"Comptes",v:String(multiTots.accts),c:"#1c1917"},{l:"Total Débit",v:fmt(multiTots.d)+" €",c:"#1c1917"},
                  {l:"Total Crédit",v:fmt(multiTots.c)+" €",c:"#1c1917"},
                  {l:"Lettrées",v:String(multiTots.m),c:"#16a34a"},{l:"Non lettrées",v:String(multiTots.um),c:multiTots.um>0?"#dc2626":"#16a34a"}
                ].map((m,i)=><div key={i} style={{background:"#faf9f6",borderRadius:7,border:"1px solid #e8e4db",padding:"8px 10px",textAlign:"center"}}>
                  <div style={{fontSize:8,color:"#a8a29e",fontWeight:600,textTransform:"uppercase",letterSpacing:0.4}}>{m.l}</div>
                  <div style={{fontSize:14,fontWeight:800,color:m.c,marginTop:2,fontVariantNumeric:"tabular-nums"}}>{m.v}</div>
                </div>)}
              </div>

              {/* ── Filtre de période ── */}
              <div style={{background:"#faf9f6",borderRadius:8,border:"1px solid #d6d0c4",padding:"10px 14px",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#78716c",textTransform:"uppercase",letterSpacing:0.5}}>Période</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:10,color:"#a8a29e"}}>Du</span>
                    <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setAcctPage(0);setEntryPages({});}}
                      style={{padding:"4px 8px",borderRadius:5,border:"1.5px solid #d6d0c4",fontSize:10,fontFamily:"inherit",background:"#fff",color:"#1c1917",outline:"none"}}/>
                    <span style={{fontSize:10,color:"#a8a29e"}}>au</span>
                    <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setAcctPage(0);setEntryPages({});}}
                      style={{padding:"4px 8px",borderRadius:5,border:"1.5px solid #d6d0c4",fontSize:10,fontFamily:"inherit",background:"#fff",color:"#1c1917",outline:"none"}}/>
                  </div>
                  {(dateFrom !== "2025-01-01" || dateTo !== "2025-12-31") && (
                    <button onClick={()=>{setDateFrom("2025-01-01");setDateTo("2025-12-31");setMonthClickPhase(0);setAcctPage(0);setEntryPages({});}}
                      style={{padding:"3px 8px",borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                        border:"1.5px solid #dc2626",background:"transparent",color:"#dc2626"}}>✕ Réinit.</button>
                  )}
                </div>
                {/* Raccourcis mensuels */}
                <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:6,flexWrap:"wrap"}}>
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
                          style={{padding:"4px 0",textAlign:"center",cursor:"pointer",userSelect:"none",flex:1,minWidth:34,
                            borderRight: i < 11 ? "0.5px solid #e8e4db" : "none",
                            background: isEdge ? "#c9a227" : inRange ? "#c9a22720" : "#fff",
                            color: isEdge ? "#fff" : inRange ? "#8b6914" : "#78716c",
                            fontWeight: inRange ? 700 : 400, fontSize: 10,
                            outline: isWaiting ? "2px solid #c9a22780" : "none", outlineOffset: "-2px",
                            transition: "all 0.12s"}}>
                          {p.l}
                        </div>
                      );
                    })}
                  </div>
                  {monthClickPhase === 1 && (
                    <span style={{fontSize:9,color:"#c9a227",fontWeight:600,fontStyle:"italic"}}>Cliquez un 2e mois pour la fin</span>
                  )}
                </div>
                {/* Raccourcis trimestriels */}
                <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:9,fontWeight:600,color:"#a8a29e",textTransform:"uppercase",letterSpacing:0.4,marginRight:4}}>Trim.</span>
                  {[{l:"T1",from:"2025-01-01",to:"2025-03-31"},{l:"T2",from:"2025-04-01",to:"2025-06-30"},
                    {l:"T3",from:"2025-07-01",to:"2025-09-30"},{l:"T4",from:"2025-10-01",to:"2025-12-31"},
                    {l:"S1",from:"2025-01-01",to:"2025-06-30"},{l:"S2",from:"2025-07-01",to:"2025-12-31"},
                    {l:"Exercice",from:"2025-01-01",to:"2025-12-31"},
                  ].map((p,i) => {
                    const isActive = dateFrom === p.from && dateTo === p.to;
                    return (
                      <button key={i} onClick={()=>{setDateFrom(p.from);setDateTo(p.to);setMonthClickPhase(0);setAcctPage(0);setEntryPages({});}}
                        style={{padding:"3px 9px",borderRadius:4,fontSize:9,fontWeight:isActive?700:400,cursor:"pointer",fontFamily:"inherit",
                          border:`1.5px solid ${isActive?"#c9a227":"#d6d0c4"}`,background:isActive?"#c9a227":"#fff",color:isActive?"#fff":"#57534e",
                          transition:"all 0.12s"}}>{p.l}</button>
                    );
                  })}
                </div>
              </div>

              {/* Expand / Collapse + Search + Pagination */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,marginTop:4,flexWrap:"wrap",gap:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {(()=>{
                    const allExpanded = [...checkedAccts].every(a => expandedAccts.has(a)) && checkedAccts.size > 0;
                    return (
                      <button onClick={()=>{ if (allExpanded) setExpandedAccts(new Set()); else setExpandedAccts(new Set([...checkedAccts])); }}
                        style={{padding:"4px 12px",borderRadius:5,border:"1px solid #d6d0c4",background:"#fff",color:"#1c1917",fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
                        <span style={{fontSize:8}}>{allExpanded ? "▶" : "▼"}</span> {allExpanded ? "Tout replier" : "Tout déplier"}
                      </button>
                    );
                  })()}
                </div>
                {/* Recherche multi-comptes */}
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#78716c",textTransform:"uppercase",letterSpacing:0.5}}>Rechercher</span>
                  {mainSearchTags.map(tag => (
                    <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:4,
                      background:"#c9a22715",border:"1px solid #c9a22740",fontSize:10,fontWeight:600,color:"#8b6914"}}>
                      <span style={{fontFamily:"monospace"}}>{tag}</span>
                      <span style={{fontSize:9,color:"#57534e"}}>{ACCOUNT_NAMES[tag] || ""}</span>
                      <span onClick={()=>{setMainSearchTags(p=>p.filter(t=>t!==tag));setAcctPage(0);}}
                        style={{cursor:"pointer",color:"#dc2626",fontWeight:700,fontSize:11,marginLeft:2}}>✕</span>
                    </span>
                  ))}
                  <div style={{position:"relative",width:180}}>
                    <input type="text" placeholder={mainSearchTags.length > 0 ? "Ajouter un filtre…" : "Filtrer par compte…"}
                      value={mainSearchInput}
                      onChange={e=>setMainSearchInput(e.target.value)}
                      style={{width:"100%",padding:"5px 10px",borderRadius:5,border:`1.5px solid ${mainSearchInput?"#c9a227":"#d6d0c4"}`,
                        fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"}}/>
                    {mainSearchInput && (()=>{
                      const q = mainSearchInput.toUpperCase().trim();
                      const suggestions = [...checkedAccts].filter(a => 
                        (a.toUpperCase().includes(q) || (ACCOUNT_NAMES[a]||"").toUpperCase().includes(q)) && !mainSearchTags.includes(a)
                      ).sort().slice(0, 8);
                      if (suggestions.length === 0) return null;
                      return (
                        <div style={{position:"absolute",top:"100%",right:0,width:320,zIndex:10,marginTop:2,background:"#fff",borderRadius:6,
                          border:"1.5px solid #c9a227",boxShadow:"0 6px 16px rgba(0,0,0,0.12)",maxHeight:200,overflowY:"auto"}}>
                          {suggestions.map(a => {
                            const acctEntries = filteredEntries.filter(e=>e.account===a);
                            const d = acctEntries.reduce((s,e)=>s+e.debit,0), c = acctEntries.reduce((s,e)=>s+e.credit,0);
                            const solde = d - c;
                            return (
                              <div key={a} onClick={()=>{setMainSearchTags(p=>[...p,a]);setMainSearchInput("");setAcctPage(0);}}
                                style={{padding:"6px 10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
                                  borderBottom:"0.5px solid #f0ece3",transition:"background 0.1s"}}
                                onMouseEnter={e=>e.currentTarget.style.background="#f5f3ee"}
                                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                                <div>
                                  <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:getAC(a).color,marginRight:6}}>{a}</span>
                                  <span style={{fontSize:10,color:"#57534e"}}>{ACCOUNT_NAMES[a]||""}</span>
                                </div>
                                <span style={{fontSize:10,fontWeight:500,fontVariantNumeric:"tabular-nums",
                                  color:solde>0.005?"#16a34a":solde<-0.005?"#dc2626":"#78716c"}}>
                                  {Math.abs(solde)>0.005?`${fmt(Math.abs(solde))} ${solde>0?"D":"C"}`:"Soldé"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  {mainSearchTags.length > 0 && (
                    <button onClick={()=>{setMainSearchTags([]);setAcctPage(0);}}
                      style={{padding:"4px 8px",borderRadius:4,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                        border:"1.5px solid #dc2626",background:"transparent",color:"#dc2626"}}>✕ Effacer filtres</button>
                  )}
                </div>
              </div>
              {/* Par page + compteur */}
              {(()=>{
                let sortedAccts = [...checkedAccts].sort((a, b) => {
                  if (a.charAt(0) !== b.charAt(0)) return a.charAt(0).localeCompare(b.charAt(0));
                  return a.localeCompare(b);
                });
                if (mainSearchTags.length > 0) sortedAccts = sortedAccts.filter(a => mainSearchTags.includes(a));
                return (
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4,paddingBottom:8,borderBottom:"1px solid #e8e4db"}}>
                    <div style={{fontSize:11,color:"#78716c"}}>
                      Comptes {Math.min(acctPage * acctPerPage + 1, sortedAccts.length)}–{Math.min((acctPage+1) * acctPerPage, sortedAccts.length)} sur {sortedAccts.length}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:10,color:"#a8a29e"}}>Par page :</span>
                      {[5,10,20].map(n=>(
                        <button key={n} onClick={()=>{setAcctPerPage(n);setAcctPage(0);}} style={{
                          padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:acctPerPage===n?700:500,cursor:"pointer",fontFamily:"inherit",
                          border:`1px solid ${acctPerPage===n?"#1c1917":"#d6d0c4"}`,background:acctPerPage===n?"#1c1917":"transparent",color:acctPerPage===n?"#fff":"#57534e"
                        }}>{n}</button>
                      ))}
                      <div style={{width:1,height:16,background:"#d6d0c4",margin:"0 4px"}}/>
                      <button onClick={()=>window.print()}
                        style={{padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                          border:"1px solid #d6d0c4",background:"#fff",color:"#57534e",display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f5f3ee"}} onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}>
                        🖨 Imprimer
                      </button>
                      <button onClick={()=>{
                        const rows = [["Compte","Libellé","Date","Pièce","Journal","Libellé écriture","Débit","Crédit","Lettre"]];
                        [...checkedAccts].sort().forEach(acct => {
                          filteredEntries.filter(e=>e.account===acct).forEach(e => {
                            rows.push([acct,ACCOUNT_NAMES[acct]||"",e.date,e.piece,e.journal,e.label,e.debit.toFixed(2),e.credit.toFixed(2),e.lettre||""]);
                          });
                        });
                        const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join("\n");
                        const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href=url; a.download="grand_livre.csv"; a.click(); URL.revokeObjectURL(url);
                      }}
                        style={{padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                          border:"1px solid #d6d0c4",background:"#fff",color:"#57534e",display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f5f3ee"}} onMouseLeave={e=>{e.currentTarget.style.background="#fff"}}>
                        📥 CSV
                      </button>
                      <button onClick={()=>{
                        const rows = [["Compte","Libellé","Date","Pièce","Journal","Libellé écriture","Débit","Crédit","Lettre"]];
                        [...checkedAccts].sort().forEach(acct => {
                          filteredEntries.filter(e=>e.account===acct).forEach(e => {
                            rows.push([acct,ACCOUNT_NAMES[acct]||"",e.date,e.piece,e.journal,e.label,e.debit,e.credit,e.lettre||""]);
                          });
                        });
                        let xml = '<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
                        xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
                        xml += '<Worksheet ss:Name="Grand Livre"><Table>';
                        rows.forEach((row,ri) => {
                          xml += '<Row>';
                          row.forEach((cell,ci) => {
                            const isNum = ri > 0 && (ci === 6 || ci === 7);
                            xml += isNum
                              ? `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`
                              : `<Cell><Data ss:Type="String">${String(cell).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</Data></Cell>`;
                          });
                          xml += '</Row>';
                        });
                        xml += '</Table></Worksheet></Workbook>';
                        const blob = new Blob([xml],{type:"application/vnd.ms-excel"});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href=url; a.download="grand_livre.xls"; a.click(); URL.revokeObjectURL(url);
                      }}
                        style={{padding:"3px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                          border:"1px solid #16a34a",background:"#f0fdf4",color:"#16a34a",display:"flex",alignItems:"center",gap:4,transition:"all 0.12s"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="#dcfce7"}} onMouseLeave={e=>{e.currentTarget.style.background="#f0fdf4"}}>
                        📥 Excel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>

          {/* ── ZONE SCROLLABLE : Comptes et écritures ── */}
          <div style={{flex:1,overflowY:"auto",padding:"0 18px 14px",minHeight:0}}>
          {checkedAccts.size > 0 && (
            <div>

              {/* Accounts */}
              {(()=>{
                let sortedAccts = [...checkedAccts].sort((a, b) => {
                  if (a.charAt(0) !== b.charAt(0)) return a.charAt(0).localeCompare(b.charAt(0));
                  return a.localeCompare(b);
                });
                if (mainSearchTags.length > 0) {
                  sortedAccts = sortedAccts.filter(a => mainSearchTags.includes(a));
                }
                const totalAcctPages = Math.ceil(sortedAccts.length / acctPerPage);
                const pagedAccts = sortedAccts.slice(acctPage * acctPerPage, (acctPage + 1) * acctPerPage);
                return (<>

                  {(()=>{
                    // Build display items: centralized roots at their sort position, detail accounts elsewhere
                    const centralizedAccts = new Set();
                    const centralizedMap = {};

                    // Identify centralized roots and their children — most specific first
                    if (centralizedRoots.size > 0) {
                      const sortedCentRoots = allRoots.filter(r => centralizedRoots.has(r.number)).sort((a,b) => b.number.length - a.number.length);
                      const acctToRoot = new Map(); // account → most specific root
                      sortedCentRoots.forEach(r => {
                        const activeChildren = r.children.filter(c => checkedAccts.has(c) && !acctToRoot.has(c));
                        if (activeChildren.length > 0) {
                          centralizedMap[r.number] = { root: r, accounts: activeChildren };
                          activeChildren.forEach(c => { centralizedAccts.add(c); acctToRoot.set(c, r.number); });
                        }
                      });
                    }

                    // Build sorted display list: for each pagedAcct, either show it as detail or replace with its centralized root (shown once)
                    const displayItems = [];
                    const shownCentralized = new Set();

                    pagedAccts.forEach(acct => {
                      if (centralizedAccts.has(acct)) {
                        // Find the most specific root for this account
                        const matchingRoots = allRoots.filter(r => centralizedRoots.has(r.number) && r.children.includes(acct) && centralizedMap[r.number]);
                        const parentRoot = matchingRoots.sort((a,b) => b.number.length - a.number.length)[0];
                        if (parentRoot && !shownCentralized.has(parentRoot.number)) {
                          shownCentralized.add(parentRoot.number);
                          displayItems.push({ type: "centralized", root: parentRoot, accounts: centralizedMap[parentRoot.number].accounts });
                        }
                        // Skip individual display — handled by centralized
                      } else {
                        displayItems.push({ type: "detail", account: acct });
                      }
                    });

                    return (<>
                      {displayItems.map((item, idx) => {
                        if (item.type === "centralized") {
                          const r = item.root;
                        const clr = (ACCOUNT_CLASSES[r.cls]||{color:"#78716c"}).color;
                        const allE = filteredEntries.filter(e => item.accounts.includes(e.account));
                        const cD = allE.reduce((s,e)=>s+e.debit,0), cC = allE.reduce((s,e)=>s+e.credit,0);
                        const cSolde = cD - cC;
                        const cUm = allE.filter(e=>!e.lettre).length;
                        const isExp = expandedAccts.has(`central_${r.number}`);

                        return (
                          <div key={`central_${r.number}`} style={{background:"#faf9f6",borderRadius:8,border:`1px solid ${isExp?`${clr}40`:"#d6d0c4"}`,marginBottom:10,overflow:"hidden",transition:"border-color 0.15s"}}>
                            <div onClick={()=>{setExpandedAccts(p=>{const n=new Set(p);const k=`central_${r.number}`;if(n.has(k))n.delete(k);else n.add(k);return n;})}}
                              style={{padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",
                                background:`${clr}08`,borderBottom:isExp?"1px solid #e8e4db":"none"}}>
                              <div style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontSize:9,transition:"transform 0.15s",transform:isExp?"rotate(90deg)":"rotate(0)",color:"#a8a29e"}}>▶</span>
                                <span style={{fontFamily:"monospace",fontWeight:800,fontSize:14,color:clr}}>{r.number}</span>
                                <span style={{fontSize:12,fontWeight:600,color:"#1c1917"}}>{r.name}</span>
                                <span style={{fontSize:9,background:"#c9a227",color:"#fff",padding:"1px 6px",borderRadius:4,fontWeight:700}}>Centralisé</span>
                                <span style={{fontSize:10,color:"#a8a29e"}}>({item.accounts.length} comptes)</span>
                                {cUm>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{cUm}</span>}
                              </div>
                              <div style={{display:"flex",gap:14,fontSize:11,fontFamily:"monospace",fontVariantNumeric:"tabular-nums"}}>
                                <span>D: <strong>{fmt(cD)}</strong></span>
                                <span>C: <strong>{fmt(cC)}</strong></span>
                                <span style={{fontWeight:700,color:cSolde>0.005?"#16a34a":cSolde<-0.005?"#dc2626":"#78716c"}}>
                                  {fmt(Math.abs(cSolde))} {cSolde>0.005?"D":cSolde<-0.005?"C":"Soldé"}
                                </span>
                              </div>
                            </div>
                            {/* Expanded: show sub-accounts summary */}
                            {isExp && (
                              <div>
                                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                                  <thead><tr style={{background:"#f0ede6"}}>
                                    {["Sous-compte","Libellé","Débit","Crédit","Solde","Non lettrées"].map((h,i)=>
                                      <th key={i} style={{padding:"7px 9px",textAlign:i>=2?"right":"left",fontSize:8,fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:"#a8a29e",borderBottom:"1px solid #d6d0c4"}}>{h}</th>
                                    )}
                                  </tr></thead>
                                  <tbody>
                                    {item.accounts.map(a => {
                                      const aE = filteredEntries.filter(e=>e.account===a);
                                      const aD = aE.reduce((s,e)=>s+e.debit,0), aC2 = aE.reduce((s,e)=>s+e.credit,0);
                                      const aSolde = aD - aC2;
                                      const aUm = aE.filter(e=>!e.lettre).length;
                                      return (
                                        <tr key={a} style={{borderBottom:"1px solid #f0ece3",cursor:"pointer"}}
                                          onClick={()=>{setCentralizedRoots(p=>{const n=new Set(p);n.delete(r.number);return n;});}}
                                          onMouseEnter={ev=>ev.currentTarget.style.background="#f5f5f0"}
                                          onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                                          <td style={{padding:"6px 9px",fontFamily:"monospace",fontSize:10,fontWeight:600,color:clr}}>{a}</td>
                                          <td style={{padding:"6px 9px",fontSize:10}}>{ACCOUNT_NAMES[a]||a}</td>
                                          <td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(aD)}</td>
                                          <td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(aC2)}</td>
                                          <td style={{padding:"6px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:700,color:aSolde>0.005?"#16a34a":aSolde<-0.005?"#dc2626":"#78716c"}}>
                                            {fmt(Math.abs(aSolde))} {aSolde>0.005?"D":aSolde<-0.005?"C":""}
                                          </td>
                                          <td style={{padding:"6px 9px",textAlign:"right"}}>{aUm>0?<span style={{background:"#fef2f2",color:"#dc2626",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:6}}>{aUm}</span>:<span style={{color:"#a8a29e",fontSize:10}}>0</span>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot><tr style={{background:"#f0ede6",fontWeight:700}}>
                                    <td colSpan={2} style={{padding:"7px 9px",textAlign:"right",fontSize:9,color:"#78716c",textTransform:"uppercase"}}>Total {r.number}</td>
                                    <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(cD)}</td>
                                    <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(cC)}</td>
                                    <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:800,color:cSolde>0?"#16a34a":"#dc2626"}}>{fmt(Math.abs(cSolde))} {cSolde>0.005?"D":cSolde<-0.005?"C":""}</td>
                                    <td/>
                                  </tr></tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                        } else {
                        // Detail account
                        const acct = item.account;
                const ac = getAC(acct);
                let acctE = filteredEntries.filter(e => e.account === acct);
                if (fMode==="unmatched") acctE = acctE.filter(e=>!e.lettre);
                if (fMode==="matched") acctE = acctE.filter(e=>!!e.lettre);
                acctE = acctE.sort((a,b)=>a.date.localeCompare(b.date));
                const aD = acctE.reduce((s,e)=>s+e.debit,0), aC = acctE.reduce((s,e)=>s+e.credit,0);
                const aSolde = aD - aC;
                const aUm = filteredEntries.filter(e=>e.account===acct&&!e.lettre).length;
                const aM = filteredEntries.filter(e=>e.account===acct&&!!e.lettre).length;
                const aT = filteredEntries.filter(e=>e.account===acct).length;
                const isExp = expandedAccts.has(acct);
                const ePage = entryPages[acct] || 0;
                const totalEPages = Math.ceil(acctE.length / entriesPerPage);
                const pagedEntries = acctE.slice(ePage * entriesPerPage, (ePage + 1) * entriesPerPage);

                return (
                  <div key={acct} style={{background:"#faf9f6",borderRadius:8,border:`1px solid ${isExp?ac.color+"40":"#d6d0c4"}`,marginBottom:10,overflow:"hidden",transition:"border-color 0.15s"}}>
                    <div onClick={()=>toggleExpand(acct)} style={{
                      padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",
                      background:isExp?`${ac.color}08`:"transparent",transition:"background 0.12s",
                    }}
                    onMouseEnter={ev=>{if(!isExp)ev.currentTarget.style.background="#f5f5f0"}}
                    onMouseLeave={ev=>{ev.currentTarget.style.background=isExp?`${ac.color}08`:"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <span style={{fontSize:9,transition:"transform 0.15s",transform:isExp?"rotate(90deg)":"rotate(0)",color:"#a8a29e"}}>▶</span>
                        <span style={{fontFamily:"monospace",fontWeight:800,fontSize:14,color:ac.color}}>{acct}</span>
                        <span style={{fontSize:12,color:"#57534e"}}>{ACCOUNT_NAMES[acct]||acct}</span>
                        {aUm>0&&<span style={{background:"#fef2f2",color:"#dc2626",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8}}>{aUm}</span>}
                      </div>
                      <div style={{display:"flex",gap:14,fontSize:11,fontFamily:"monospace",fontVariantNumeric:"tabular-nums"}}>
                        <span>D: <strong>{fmt(aD)}</strong></span>
                        <span>C: <strong>{fmt(aC)}</strong></span>
                        <span style={{fontWeight:700,color:aSolde>0.005?"#16a34a":aSolde<-0.005?"#dc2626":"#78716c"}}>
                          {fmt(Math.abs(aSolde))} {aSolde>0.005?"D":aSolde<-0.005?"C":"Soldé"}
                        </span>
                      </div>
                    </div>

                    {isExp && (
                      <div>
                        <div style={{padding:"5px 14px",display:"flex",gap:5,background:"#f5f3ee",borderTop:"1px solid #e8e4db",borderBottom:"1px solid #e8e4db"}}>
                          {[{v:"all",l:`Toutes (${aT})`},{v:"unmatched",l:`Non lettrées (${aUm})`},{v:"matched",l:`Lettrées (${aM})`}].map(f=>
                            <button key={f.v} onClick={(ev)=>{ev.stopPropagation();setFMode(f.v)}} style={{
                              padding:"3px 9px",borderRadius:12,fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                              border:`1px solid ${fMode===f.v?ac.color:"#d6d0c4"}`,background:fMode===f.v?ac.color:"transparent",color:fMode===f.v?"#fff":"#57534e"
                            }}>{f.l}</button>
                          )}
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead><tr style={{background:"#f0ede6"}}>
                            {["","Date","Pièce","Journal","Libellé","Débit","Crédit","Lettre","Solde prog."].map((h,i)=>
                              <th key={i} style={{padding:"7px 9px",textAlign:i>=5?"right":"left",fontSize:8,fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:"#a8a29e",borderBottom:"1px solid #d6d0c4",whiteSpace:"nowrap"}}>{h}</th>
                            )}
                          </tr></thead>
                          <tbody>
                            {pagedEntries.length===0?<tr><td colSpan={9} style={{textAlign:"center",padding:24,color:"#a8a29e",fontStyle:"italic",fontSize:11}}>Aucune écriture.</td></tr>
                            :(()=>{let rb=acctE.slice(0, ePage * entriesPerPage).reduce((s,e)=>s+e.debit-e.credit,0);return pagedEntries.map(e=>{
                              rb+=e.debit-e.credit;const isSel=selIds.has(e.id),isM=!!e.lettre;
                              return(<tr key={e.id} onClick={()=>toggle(e.id)} style={{cursor:"pointer",borderBottom:"1px solid #ece8e0",background:isSel?"#fef9c3":isM?"#f0fdf4":"transparent",transition:"background 0.1s"}}
                                onMouseEnter={ev=>{if(!isSel&&!isM)ev.currentTarget.style.background="#f5f5f0"}}
                                onMouseLeave={ev=>{ev.currentTarget.style.background=isSel?"#fef9c3":isM?"#f0fdf4":"transparent"}}>
                                <td style={{padding:"5px 9px",width:26,textAlign:"center"}}><input type="checkbox" checked={isSel} onChange={()=>toggle(e.id)} onClick={ev=>ev.stopPropagation()} style={{accentColor:ac.color,cursor:"pointer"}}/></td>
                                <td style={{padding:"5px 9px",whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums",fontSize:10}}>{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                                <td style={{padding:"5px 9px",fontFamily:"monospace",fontSize:9,color:"#78716c"}}>{e.piece}</td>
                                <td style={{padding:"5px 9px"}}><span style={{background:`${ac.color}14`,padding:"1px 5px",borderRadius:3,fontSize:8,fontWeight:700,color:ac.color}}>{e.journal}</span></td>
                                <td style={{padding:"5px 9px",fontSize:10}}>{e.label}</td>
                                <td style={{padding:"5px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:e.debit>0?700:400,color:e.debit>0?"#1c1917":"#d6d0c4"}}>{e.debit>0?fmt(e.debit):"—"}</td>
                                <td style={{padding:"5px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:e.credit>0?700:400,color:e.credit>0?"#1c1917":"#d6d0c4"}}>{e.credit>0?fmt(e.credit):"—"}</td>
                                <td style={{padding:"5px 9px",textAlign:"right"}}>{isM?<span style={{background:"#16a34a",color:"#fff",padding:"2px 5px",borderRadius:3,fontSize:8,fontWeight:700,letterSpacing:1}}>{e.lettre}</span>:<span style={{color:"#d6d0c4"}}>—</span>}</td>
                                <td style={{padding:"5px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontWeight:700,fontSize:10,color:rb>0.005?"#16a34a":rb<-0.005?"#dc2626":"#78716c"}}>{fmt(Math.abs(rb))} {rb>0.005?"D":rb<-0.005?"C":""}</td>
                              </tr>);
                            });})()}
                          </tbody>
                          {acctE.length>0&&<tfoot><tr style={{background:"#f0ede6",fontWeight:700}}>
                            <td colSpan={5} style={{padding:"7px 9px",textAlign:"right",fontSize:9,color:"#78716c",textTransform:"uppercase"}}>Totaux</td>
                            <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(aD)}</td>
                            <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11}}>{fmt(aC)}</td>
                            <td/>
                            <td style={{padding:"7px 9px",textAlign:"right",fontVariantNumeric:"tabular-nums",fontSize:11,fontWeight:800,color:aSolde>0?"#16a34a":"#dc2626"}}>{fmt(Math.abs(aSolde))} {aSolde>0.005?"D":aSolde<-0.005?"C":""}</td>
                          </tr></tfoot>}
                        </table>
                        {/* Entry pagination */}
                        {totalEPages > 1 && (
                          <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid #e8e4db",background:"#f5f3ee"}}>
                            <span style={{fontSize:10,color:"#78716c"}}>Écritures {ePage * entriesPerPage + 1}–{Math.min((ePage+1)*entriesPerPage, acctE.length)} sur {acctE.length}</span>
                            <div style={{display:"flex",alignItems:"center",gap:4}}>
                              <button onClick={(ev)=>{ev.stopPropagation();setEntryPages(p=>({...p,[acct]:Math.max(0,(p[acct]||0)-1)}))}} disabled={ePage===0}
                                style={{padding:"3px 8px",borderRadius:4,border:"1px solid #d6d0c4",background:ePage===0?"#f5f3ee":"#fff",color:ePage===0?"#d6d0c4":"#1c1917",fontSize:10,fontWeight:600,cursor:ePage===0?"default":"pointer",fontFamily:"inherit"}}>←</button>
                              <span style={{fontSize:10,fontWeight:700,minWidth:30,textAlign:"center"}}>{ePage+1}/{totalEPages}</span>
                              <button onClick={(ev)=>{ev.stopPropagation();setEntryPages(p=>({...p,[acct]:Math.min(totalEPages-1,(p[acct]||0)+1)}))}} disabled={ePage>=totalEPages-1}
                                style={{padding:"3px 8px",borderRadius:4,border:"1px solid #d6d0c4",background:ePage>=totalEPages-1?"#f5f3ee":"#fff",color:ePage>=totalEPages-1?"#d6d0c4":"#1c1917",fontSize:10,fontWeight:600,cursor:ePage>=totalEPages-1?"default":"pointer",fontFamily:"inherit"}}>→</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
                }
              })}
                    </>);
                  })()}
                </>);
              })()}

            </div>
          )}
          </div>

          {/* ── PAGINATION PIED DE PAGE FIXE ── */}
          {checkedAccts.size > 0 && (()=>{
            let sortedAccts = [...checkedAccts].sort((a, b) => {
              if (a.charAt(0) !== b.charAt(0)) return a.charAt(0).localeCompare(b.charAt(0));
              return a.localeCompare(b);
            });
            if (mainSearchTags.length > 0) sortedAccts = sortedAccts.filter(a => mainSearchTags.includes(a));
            const totalAcctPages = Math.ceil(sortedAccts.length / acctPerPage);
            if (totalAcctPages <= 1) return null;
            return (
              <div style={{flexShrink:0,padding:"6px 18px",background:"#faf9f6",borderTop:"1px solid #e8e4db",display:"flex",justifyContent:"flex-end",alignItems:"center",gap:6}}>
                  <button onClick={()=>setAcctPage(p=>Math.max(0,p-1))} disabled={acctPage===0}
                    style={{padding:"4px 10px",borderRadius:5,border:"1px solid #d6d0c4",background:acctPage===0?"#f5f3ee":"#fff",color:acctPage===0?"#d6d0c4":"#1c1917",fontSize:10,fontWeight:600,cursor:acctPage===0?"default":"pointer",fontFamily:"inherit"}}>← Précédent</button>
                  {Array.from({length:totalAcctPages},(_,i)=>i).map(i=>(
                    <button key={i} onClick={()=>setAcctPage(i)} style={{
                      width:28,height:28,borderRadius:6,border:`1px solid ${acctPage===i?"#1c1917":"#d6d0c4"}`,
                      background:acctPage===i?"#1c1917":"#fff",color:acctPage===i?"#fff":"#57534e",
                      fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                    }}>{i+1}</button>
                  ))}
                  <button onClick={()=>setAcctPage(p=>Math.min(totalAcctPages-1,p+1))} disabled={acctPage>=totalAcctPages-1}
                    style={{padding:"4px 10px",borderRadius:5,border:"1px solid #d6d0c4",background:acctPage>=totalAcctPages-1?"#f5f3ee":"#fff",color:acctPage>=totalAcctPages-1?"#d6d0c4":"#1c1917",fontSize:10,fontWeight:600,cursor:acctPage>=totalAcctPages-1?"default":"pointer",fontFamily:"inherit"}}>Suivant →</button>
              </div>
            );
          })()}

          {/* ── BARRE DE LETTRAGE FIXE EN BAS ── */}
          {checkedAccts.size > 0 && (
          <div style={{flexShrink:0,padding:"0 18px 10px",background:"#f0ede6"}}>
              <div style={{background:"#faf9f6",borderRadius:7,border:"1px solid #d6d0c4",padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{fontSize:11}}>
                  {selIds.size>0?<span><strong>{selIds.size}</strong> sél. · D: <strong>{fmt(sb.d)}</strong> · C: <strong>{fmt(sb.c)}</strong> · Écart: <strong style={{color:Math.abs(sb.diff)<0.01?"#16a34a":"#dc2626"}}>{fmt(Math.abs(sb.diff))} € {Math.abs(sb.diff)<0.01?"✓":"✗"}</strong></span>
                  :<span style={{color:"#a8a29e",fontStyle:"italic"}}>Cochez des écritures pour lettrer ou délettrer</span>}
                </div>
                <div style={{display:"flex",gap:7}}>
                  <button onClick={doLettre} disabled={selIds.size<2} style={{padding:"6px 16px",borderRadius:6,border:"none",fontFamily:"inherit",background:selIds.size>=2?"#16a34a":"#d6d0c4",color:"#fff",fontWeight:700,fontSize:11,cursor:selIds.size>=2?"pointer":"default"}}>Lettrer</button>
                  <button onClick={doDelettrer} disabled={!selIds.size} style={{padding:"6px 16px",borderRadius:6,border:"1.5px solid #d6d0c4",fontFamily:"inherit",background:"#fff",color:selIds.size>0?"#dc2626":"#d6d0c4",fontWeight:700,fontSize:11,cursor:selIds.size>0?"pointer":"default"}}>Délettrer</button>
                </div>
              </div>
              <div style={{marginTop:8,display:"flex",gap:14,fontSize:10,color:"#a8a29e",flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:11,height:11,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:2,display:"inline-block"}}/>Lettrée</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:11,height:11,background:"#fef9c3",border:"1px solid #fde68a",borderRadius:2,display:"inline-block"}}/>Sélectionnée</span>
                <span>D = débiteur · C = créditeur</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {notif&&<div style={{position:"fixed",bottom:18,left:"50%",transform:"translateX(-50%)",background:notif.type==="error"?"#9d0208":"#16a34a",color:"#fff",padding:"9px 18px",borderRadius:7,fontSize:12,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.25)",zIndex:999,animation:"su .25s ease",maxWidth:"90vw"}}>{notif.msg}</div>}
      <style>{`@keyframes su{from{transform:translateX(-50%) translateY(14px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`}</style>
    </div>
  );
}
