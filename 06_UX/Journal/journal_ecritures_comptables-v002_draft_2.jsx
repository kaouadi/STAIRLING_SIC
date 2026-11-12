import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";

const GOLD = "#c9a227";
const DARK = "#1c1917";
const BORDER = "#d6d0c4";
const MUTED = "#78716c";
const FAINT = "#a8a29e";
const GREEN = "#16a34a";
const RED = "#dc2626";
const BLUE = "#2563eb";

const CLASS_COLORS = { "1": "#7c3aed", "2": "#9333ea", "3": "#a855f7", "4": BLUE, "5": "#0891b2", "6": RED, "7": GREEN };
const getAccountColor = (a) => CLASS_COLORS[a.charAt(0)] || MUTED;

const formatNum = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (d) => { const [y, m, dd] = d.split("-"); return dd + "/" + m + "/" + y; };
const formatFEC = (d) => (d ? d.replace(/-/g, "") : "");

const ACCOUNT_NAMES = {
  "101000": "Capital social", "106100": "Réserve légale", "120000": "Résultat de l'exercice",
  "218200": "Matériel de transport", "218300": "Matériel bureau/info", "280000": "Amort. immobilisations",
  "310000": "Stocks matières premières",
  "4110UBER": "Clients — UBER", "4110BOLT": "Clients — BOLT", "4110HEETCH": "Clients — HEETCH", "4110FREENOW": "Clients — FREENOW",
  "4010UBER": "Fournisseurs — UBER", "4010BOLT": "Fournisseurs — BOLT",
  "4210DUPONT": "Rémun. dues — DUPONT", "4210XAVIER": "Rémun. dues — XAVIER", "4210KARIM": "Rémun. dues — KARIM",
  "445711UBER": "TVA coll. UBER 10%", "445711BOLT": "TVA coll. BOLT 10%", "445711HEETCH": "TVA coll. HEETCH 10%",
  "445660UBER": "TVA déd. UBER 20%", "445660BOLT": "TVA déd. BOLT 20%",
  "512000": "Banque Société Générale",
  "62261DUPONT": "Comm. UBER — DUPONT", "62261XAVIER": "Comm. UBER — XAVIER", "62262DUPONT": "Comm. BOLT — DUPONT",
  "6061DUPONT": "Carburant — DUPONT", "6061XAVIER": "Carburant — XAVIER",
  "6135DUPONT": "Location véh. — DUPONT", "6152DUPONT": "Entretien — DUPONT",
  "6155DUPONT": "Téléphonie — DUPONT", "6251DUPONT": "Péages — DUPONT", "6811DUPONT": "Dot. amort. — DUPONT",
  "70611DUPONT": "Ventes UBER 10 % — DUPONT", "70611XAVIER": "Ventes UBER 10 % — XAVIER", "70611KARIM": "Ventes UBER 10 % — KARIM",
  "70621DUPONT": "Ventes BOLT 10 % — DUPONT", "70621XAVIER": "Ventes BOLT 10 % — XAVIER",
  "70631DUPONT": "Ventes HEETCH 10 % — DUPONT", "70641DUPONT": "Ventes FREENOW 10 % — DUPONT",
};

const JOURNALS = [
  { code: "AFSG", lib: "AFFACTURAGE SOCIETE GENERALE" }, { code: "AN", lib: "A NOUVEAUX" },
  { code: "BQ", lib: "JOURNAL DE BANQUE" }, { code: "BRA", lib: "BANQUE RHONE ALPES" },
  { code: "HA", lib: "JOURNAL DES ACHATS" }, { code: "JC", lib: "JOURNAL DE CAISSE" },
  { code: "JVT_BOLT", lib: "JOURNAL VENTES BOLT" }, { code: "JVT_FREENOW", lib: "JOURNAL VENTES FREENOW" },
  { code: "JVT_HEETCH", lib: "JOURNAL VENTES HEETCH" }, { code: "JVT_UBER", lib: "JOURNAL VENTES UBER" },
  { code: "OD", lib: "OPERATIONS DIVERSES" }, { code: "REV", lib: "REVOLUT BANQUE" },
  { code: "SG", lib: "SOCIETE GENERALE" }, { code: "VT", lib: "JOURNAL DES VENTES" },
];
const JOURNAL_LIB = {};
JOURNALS.forEach((j) => { JOURNAL_LIB[j.code] = j.lib; });

const MONTHS = [
  { l: "Janv.", f: "2025-01-01", t: "2025-01-31" }, { l: "Fév.", f: "2025-02-01", t: "2025-02-28" },
  { l: "Mars", f: "2025-03-01", t: "2025-03-31" }, { l: "Avr.", f: "2025-04-01", t: "2025-04-30" },
  { l: "Mai", f: "2025-05-01", t: "2025-05-31" }, { l: "Juin", f: "2025-06-01", t: "2025-06-30" },
  { l: "Juil.", f: "2025-07-01", t: "2025-07-31" }, { l: "Août", f: "2025-08-01", t: "2025-08-31" },
  { l: "Sept.", f: "2025-09-01", t: "2025-09-30" }, { l: "Oct.", f: "2025-10-01", t: "2025-10-31" },
  { l: "Nov.", f: "2025-11-01", t: "2025-11-30" }, { l: "Déc.", f: "2025-12-01", t: "2025-12-31" },
];

const TRIMS = [
  { l: "T1", f: "2025-01-01", t: "2025-03-31" }, { l: "T2", f: "2025-04-01", t: "2025-06-30" },
  { l: "T3", f: "2025-07-01", t: "2025-09-30" }, { l: "T4", f: "2025-10-01", t: "2025-12-31" },
  { l: "S1", f: "2025-01-01", t: "2025-06-30" }, { l: "S2", f: "2025-07-01", t: "2025-12-31" },
  { l: "Exercice", f: "2025-01-01", t: "2025-12-31" },
];

const ENTRIES = [
  // 01/01/2025 — À-nouveaux
  { id: 100, num: "1", date: "2025-01-01", account: "101000", label: "Capital social — apport initial", journal: "AN", piece: "AN-2025-001", debit: 0, credit: 10000, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 101, num: "2", date: "2025-01-01", account: "106100", label: "Réserve légale", journal: "AN", piece: "AN-2025-002", debit: 0, credit: 1500, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 102, num: "3", date: "2025-01-01", account: "120000", label: "Report à nouveau N-1", journal: "AN", piece: "AN-2025-003", debit: 0, credit: 3200, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 103, num: "4", date: "2025-01-01", account: "218200", label: "Véhicule Peugeot e-208", journal: "AN", piece: "AN-2025-004", debit: 32000, credit: 0, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 104, num: "5", date: "2025-01-01", account: "218300", label: "Ordinateur + smartphone", journal: "AN", piece: "AN-2025-005", debit: 2400, credit: 0, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 105, num: "6", date: "2025-01-01", account: "280000", label: "Amort. cumulés — report", journal: "AN", piece: "AN-2025-006", debit: 0, credit: 8000, lettre: "", validDate: "2025-01-01", status: "V" },
  { id: 107, num: "7", date: "2025-01-01", account: "310000", label: "Stock pièces détachées", journal: "AN", piece: "AN-2025-007", debit: 850, credit: 0, lettre: "", validDate: "2025-01-01", status: "V" },
  // 01/01/2025 — Achats
  { id: 75, num: "8", date: "2025-01-01", account: "6135DUPONT", label: "Location Peugeot e-208 — janv.", journal: "HA", piece: "NF-2025-D002", debit: 580, credit: 0, lettre: "", validDate: "2025-01-01", status: "V" },
  // 05/01/2025 — Ventes UBER + Achats
  { id: 1, num: "9", date: "2025-01-05", account: "70611DUPONT", label: "CA UBER — DUPONT 05/01", journal: "JVT_UBER", piece: "VU-2025-001", debit: 0, credit: 1540, lettre: "", validDate: "2025-01-05", status: "V" },
  { id: 7, num: "10", date: "2025-01-05", account: "70611XAVIER", label: "CA UBER — XAVIER 05/01", journal: "JVT_UBER", piece: "VU-2025-040", debit: 0, credit: 1180, lettre: "", validDate: "2025-01-05", status: "V" },
  { id: 10, num: "11", date: "2025-01-05", account: "70611KARIM", label: "CA UBER — KARIM 05/01", journal: "JVT_UBER", piece: "VU-2025-060", debit: 0, credit: 1620, lettre: "", validDate: "2025-01-05", status: "V" },
  { id: 20, num: "12", date: "2025-01-05", account: "4110UBER", label: "Facture ventes UBER sem.01", journal: "JVT_UBER", piece: "FVU-2025-S01", debit: 4840, credit: 0, lettre: "AA", validDate: "2025-01-05", status: "V" },
  { id: 40, num: "13", date: "2025-01-05", account: "445711UBER", label: "TVA coll. UBER sem.01", journal: "JVT_UBER", piece: "FVU-2025-S01", debit: 0, credit: 440, lettre: "", validDate: "2025-01-05", status: "V" },
  { id: 77, num: "14", date: "2025-01-05", account: "6155DUPONT", label: "Forfait SFR Pro — janvier", journal: "HA", piece: "NF-2025-D003", debit: 29.99, credit: 0, lettre: "", validDate: "2025-01-05", status: "V" },
  // 06/01/2025 — Ventes UBER + BOLT
  { id: 2, num: "15", date: "2025-01-06", account: "70611DUPONT", label: "CA UBER — DUPONT 06/01", journal: "JVT_UBER", piece: "VU-2025-002", debit: 0, credit: 1320, lettre: "", validDate: "2025-01-06", status: "V" },
  { id: 12, num: "16", date: "2025-01-06", account: "70621DUPONT", label: "CA BOLT — DUPONT 06/01", journal: "JVT_BOLT", piece: "VB-2025-001", debit: 0, credit: 920, lettre: "", validDate: "2025-01-06", status: "V" },
  { id: 30, num: "17", date: "2025-01-06", account: "4110BOLT", label: "Facture ventes BOLT sem.01", journal: "JVT_BOLT", piece: "FVB-2025-S01", debit: 2280, credit: 0, lettre: "DD", validDate: "2025-01-06", status: "V" },
  { id: 44, num: "18", date: "2025-01-06", account: "445711BOLT", label: "TVA coll. BOLT sem.01", journal: "JVT_BOLT", piece: "FVB-2025-S01", debit: 0, credit: 207.27, lettre: "", validDate: "2025-01-06", status: "V" },
  // 07/01/2025
  { id: 3, num: "19", date: "2025-01-07", account: "70611DUPONT", label: "CA UBER — DUPONT 07/01", journal: "JVT_UBER", piece: "VU-2025-003", debit: 0, credit: 1680.50, lettre: "", validDate: "", status: "D" },
  // 08/01/2025
  { id: 15, num: "20", date: "2025-01-08", account: "70631DUPONT", label: "CA HEETCH — DUPONT 08/01", journal: "JVT_HEETCH", piece: "VH-2025-001", debit: 0, credit: 460, lettre: "", validDate: "2025-01-08", status: "V" },
  { id: 35, num: "21", date: "2025-01-08", account: "4110HEETCH", label: "Facture ventes HEETCH sem.01", journal: "JVT_HEETCH", piece: "FVH-2025-S01", debit: 506, credit: 0, lettre: "", validDate: "2025-01-08", status: "V" },
  { id: 70, num: "22", date: "2025-01-08", account: "6061DUPONT", label: "Carburant — TotalEnergies", journal: "HA", piece: "NF-2025-D001", debit: 85.40, credit: 0, lettre: "", validDate: "2025-01-08", status: "V" },
  // 10/01/2025
  { id: 200, num: "23", date: "2025-01-10", account: "70641DUPONT", label: "CA FREENOW — DUPONT 10/01", journal: "JVT_FREENOW", piece: "VF-2025-001", debit: 0, credit: 380, lettre: "", validDate: "", status: "D" },
  { id: 201, num: "24", date: "2025-01-10", account: "4110FREENOW", label: "Facture ventes FREENOW sem.01", journal: "JVT_FREENOW", piece: "FVF-2025-S01", debit: 418, credit: 0, lettre: "", validDate: "", status: "D" },
  { id: 50, num: "25", date: "2025-01-10", account: "62261DUPONT", label: "Commission UBER sem.01 — DUPONT", journal: "HA", piece: "CU-2025-D01", debit: 908.10, credit: 0, lettre: "", validDate: "2025-01-10", status: "V" },
  { id: 53, num: "26", date: "2025-01-10", account: "62261XAVIER", label: "Commission UBER sem.01 — XAVIER", journal: "HA", piece: "CU-2025-X01", debit: 472, credit: 0, lettre: "", validDate: "2025-01-10", status: "V" },
  { id: 60, num: "27", date: "2025-01-10", account: "4010UBER", label: "Facture commission UBER sem.01", journal: "HA", piece: "FCU-2025-S01", debit: 0, credit: 1380.10, lettre: "EE", validDate: "2025-01-10", status: "V" },
  { id: 65, num: "28", date: "2025-01-10", account: "445660UBER", label: "TVA déd. autoliq. UBER sem.01", journal: "HA", piece: "FCU-2025-S01", debit: 276.02, credit: 0, lettre: "", validDate: "2025-01-10", status: "V" },
  { id: 78, num: "29", date: "2025-01-10", account: "6251DUPONT", label: "Péage A6 Lyon—Villefranche", journal: "HA", piece: "NF-2025-D005", debit: 12.40, credit: 0, lettre: "", validDate: "2025-01-10", status: "V" },
  // 12/01/2025
  { id: 4, num: "30", date: "2025-01-12", account: "70611DUPONT", label: "CA UBER — DUPONT 12/01", journal: "JVT_UBER", piece: "VU-2025-010", debit: 0, credit: 1890, lettre: "", validDate: "", status: "D" },
  { id: 8, num: "31", date: "2025-01-12", account: "70611XAVIER", label: "CA UBER — XAVIER 12/01", journal: "JVT_UBER", piece: "VU-2025-041", debit: 0, credit: 1450, lettre: "", validDate: "", status: "D" },
  { id: 21, num: "32", date: "2025-01-12", account: "4110UBER", label: "Facture ventes UBER sem.02", journal: "JVT_UBER", piece: "FVU-2025-S02", debit: 5126.50, credit: 0, lettre: "BB", validDate: "2025-01-12", status: "V" },
  { id: 41, num: "33", date: "2025-01-12", account: "445711UBER", label: "TVA coll. UBER sem.02", journal: "JVT_UBER", piece: "FVU-2025-S02", debit: 0, credit: 466.05, lettre: "", validDate: "2025-01-12", status: "V" },
  // 13/01/2025
  { id: 13, num: "34", date: "2025-01-13", account: "70621DUPONT", label: "CA BOLT — DUPONT 13/01", journal: "JVT_BOLT", piece: "VB-2025-002", debit: 0, credit: 1140, lettre: "", validDate: "", status: "D" },
  // 15/01/2025 — Banque
  { id: 22, num: "35", date: "2025-01-15", account: "4110UBER", label: "Règlement UBER sem.01", journal: "BQ", piece: "RG-2025-011", debit: 0, credit: 4840, lettre: "AA", validDate: "2025-01-15", status: "V" },
  { id: 90, num: "36", date: "2025-01-15", account: "512000", label: "Encaissement UBER sem.01", journal: "BQ", piece: "RG-2025-011", debit: 4840, credit: 0, lettre: "", validDate: "2025-01-15", status: "V" },
  // 17/01/2025
  { id: 51, num: "37", date: "2025-01-17", account: "62261DUPONT", label: "Commission UBER sem.02 — DUPONT", journal: "HA", piece: "CU-2025-D02", debit: 756, credit: 0, lettre: "", validDate: "2025-01-17", status: "V" },
  // 18/01/2025
  { id: 32, num: "38", date: "2025-01-18", account: "4110BOLT", label: "Règlement BOLT sem.01", journal: "BQ", piece: "RG-2025-031", debit: 0, credit: 2280, lettre: "DD", validDate: "2025-01-18", status: "V" },
  { id: 91, num: "39", date: "2025-01-18", account: "512000", label: "Encaissement BOLT sem.01", journal: "BQ", piece: "RG-2025-031", debit: 2280, credit: 0, lettre: "", validDate: "2025-01-18", status: "V" },
  { id: 76, num: "40", date: "2025-01-18", account: "6152DUPONT", label: "Révision véhicule — garage Duval", journal: "HA", piece: "NF-2025-D012", debit: 245, credit: 0, lettre: "", validDate: "", status: "D" },
  // 19/01/2025
  { id: 5, num: "41", date: "2025-01-19", account: "70611DUPONT", label: "CA UBER — DUPONT 19/01", journal: "JVT_UBER", piece: "VU-2025-018", debit: 0, credit: 1290, lettre: "", validDate: "2025-01-19", status: "V" },
  { id: 9, num: "42", date: "2025-01-19", account: "70611XAVIER", label: "CA UBER — XAVIER 19/01", journal: "JVT_UBER", piece: "VU-2025-042", debit: 0, credit: 980, lettre: "", validDate: "2025-01-19", status: "V" },
  // 20/01/2025
  { id: 62, num: "43", date: "2025-01-20", account: "4010UBER", label: "Règlement commission UBER", journal: "BQ", piece: "RG-2025-060", debit: 1380.10, credit: 0, lettre: "EE", validDate: "2025-01-20", status: "V" },
  { id: 92, num: "44", date: "2025-01-20", account: "512000", label: "Décaissement comm. UBER", journal: "BQ", piece: "RG-2025-060", debit: 0, credit: 1380.10, lettre: "", validDate: "2025-01-20", status: "V" },
  // 22/01/2025
  { id: 93, num: "45", date: "2025-01-22", account: "512000", label: "Encaissement UBER sem.02", journal: "BQ", piece: "RG-2025-012", debit: 5126.50, credit: 0, lettre: "", validDate: "2025-01-22", status: "V" },
  // 26/01/2025
  { id: 6, num: "46", date: "2025-01-26", account: "70611DUPONT", label: "CA UBER — DUPONT 26/01", journal: "JVT_UBER", piece: "VU-2025-025", debit: 0, credit: 2010, lettre: "", validDate: "2025-01-26", status: "V" },
  // 31/01/2025 — OD
  { id: 106, num: "47", date: "2025-01-31", account: "280000", label: "Dotation amort. janv. 2025", journal: "OD", piece: "DOT-2025-001", debit: 0, credit: 533.33, lettre: "", validDate: "2025-01-31", status: "V" },
  { id: 108, num: "48", date: "2025-01-31", account: "6811DUPONT", label: "Dotation amort. véhicule janv.", journal: "OD", piece: "DOT-2025-001", debit: 533.33, credit: 0, lettre: "", validDate: "2025-01-31", status: "V" },
  { id: 80, num: "49", date: "2025-01-31", account: "4210DUPONT", label: "Salaire net janv. — DUPONT", journal: "OD", piece: "SAL-2025-D01", debit: 0, credit: 2450, lettre: "GG", validDate: "", status: "D" },
  { id: 82, num: "50", date: "2025-01-31", account: "4210XAVIER", label: "Salaire net janv. — XAVIER", journal: "OD", piece: "SAL-2025-X01", debit: 0, credit: 2180, lettre: "", validDate: "", status: "D" },
  // 05/02/2025 — Banque
  { id: 81, num: "51", date: "2025-02-05", account: "4210DUPONT", label: "Virement salaire janv. — DUPONT", journal: "BQ", piece: "VIR-2025-D01", debit: 2450, credit: 0, lettre: "GG", validDate: "2025-02-05", status: "V" },
  { id: 95, num: "52", date: "2025-02-05", account: "512000", label: "Virement salaire DUPONT janv.", journal: "BQ", piece: "VIR-2025-D01", debit: 0, credit: 2450, lettre: "", validDate: "2025-02-05", status: "V" },
];

const FEC_FIELDS = ["JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise"];

// ── Export FEC — deux modes (Spécification fonctionnelle Export FEC v1.0) ──
const AMBER = "#d97706";
const SIREN = "123456789";
const FY_FROM = "2025-01-01";
const FY_TO = "2025-12-31";
const MAP_VERSION = "MAP-2026.10-v1";

// Référentiel des comptes racines (spécification § 9.7.1) — la racine retenue est le plus long préfixe présent ici
const ROOT_REFERENTIAL = [
  { root: "70611", lib: "Ventes de courses Uber 10 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70612", lib: "Ventes Uber 20 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70621", lib: "Ventes de courses Bolt 10 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70622", lib: "Ventes Bolt 20 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70631", lib: "Ventes de courses Heetch 10 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70641", lib: "Ventes de courses FreeNow 10 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "70651", lib: "Ventes de courses Stairling 10 %", axis: "CHAUFFEUR", fecAnalyse: true },
  { root: "62261", lib: "Commissions Uber", axis: "CHAUFFEUR", fecAnalyse: false },
  { root: "4210", lib: "Rémunérations dues", axis: "CHAUFFEUR", fecAnalyse: false },
  { root: "4110", lib: "Clients plateformes", axis: "PLATEFORME", fecAnalyse: false },
];
const ROOTS = new Map(ROOT_REFERENTIAL.map((r) => [r.root, r]));

// Référentiel chauffeurs (R02 : l'extension est identifiée ici, jamais devinée)
const DRIVERS = { DUPONT: "Chauffeur DUPONT", XAVIER: "Chauffeur XAVIER", KARIM: "Chauffeur KARIM" };

const EXPORT_KINDS = {
  fiscal: { label: "FEC Fiscal 2025", icon: "📄", mode: "A" },
  analyse: { label: "FEC Analyse", icon: "📊", mode: "B" },
};

const fecAmount = (n) => (n ? n.toFixed(2).replace(".", ",") : "0,00");

// R01 : teste les préfixes du plus long au plus court ; le premier présent dans le référentiel est la racine
function findRoot(account) {
  for (let n = account.length - 1; n >= 1; n--) {
    const root = ROOTS.get(account.slice(0, n));
    if (root) return { root, extension: account.slice(n) };
  }
  return null;
}

// Résout le compte FEC d'une ligne selon le mode (résultat mis en cache par compte)
const mapCache = new Map();
function mapAccount(account, mode) {
  const lib = ACCOUNT_NAMES[account] || account;
  if (mode === "A") return { num: account, lib, auxNum: "", auxLib: "", kind: "same" };
  if (mapCache.has(account)) return mapCache.get(account);
  const found = findRoot(account);
  let res;
  if (!found || !found.root.fecAnalyse) res = { num: account, lib, auxNum: "", auxLib: "", kind: "same" };
  else if (!DRIVERS[found.extension]) res = { num: account, lib, auxNum: "", auxLib: "", kind: "error" };
  else res = { num: found.root.root, lib: found.root.lib, auxNum: found.extension, auxLib: DRIVERS[found.extension], kind: "mapped" };
  mapCache.set(account, res);
  return res;
}

const isDriverAccount = (account) => Object.keys(DRIVERS).some((d) => account.endsWith(d));

async function sha256Hex(text) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    return null;
  }
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const SEV = {
  block: { c: RED, bg: "#fef2f2", bd: "#fecaca", l: "Bloquant" },
  warn: { c: AMBER, bg: "#fffbeb", bd: "#fcd34d", l: "Avertissement" },
  info: { c: BLUE, bg: "#eff6ff", bd: "#bfdbfe", l: "Info" },
};

// Calcule un export : FEC Fiscal = exercice complet, tous journaux ; FEC Analyse = sélection de l'écran
function computeExport(kind, sel) {
  const ex = EXPORT_KINDS[kind];
  const from = kind === "fiscal" ? FY_FROM : sel.from;
  const to = kind === "fiscal" ? FY_TO : sel.to;
  const journals = kind === "fiscal" ? new Set() : sel.journals;
  const noJournal = journals.has("__NONE__");
  const allJournals = journals.size === 0;
  const periodOk = from && to && from <= to && from >= FY_FROM && to <= FY_TO;

  // Écritures validées uniquement ; recherche, lettrage et tri de l'écran ignorés
  const scope = ENTRIES.filter((e) => !noJournal && (allJournals || journals.has(e.journal)) && e.date >= from && e.date <= to);
  // Statut : l'option « Écritures validées » de l'écran pilote aussi l'export (activée → VALIDATED seules ; désactivée → DRAFT incluses)
  const onlyValidated = !!sel.onlyValidated;
  const rows = scope.filter((e) => !onlyValidated || e.status === "V")
    .sort((a, b) => (a.validDate + a.num.padStart(8, "0")).localeCompare(b.validDate + b.num.padStart(8, "0")));
  const lines = rows.map((e) => ({ e, m: mapAccount(e.account, ex.mode) }));
  let d = 0, c = 0;
  rows.forEach((e) => { d += e.debit; c += e.credit; });

  // Contrôles C01–C10 appliqués aux deux exports (FEC Fiscal et FEC Analyse)
  const anomalies = [];
  // C01 — Sélection : périmètre dans l'exercice, au moins un journal ; le FEC Fiscal couvre l'exercice entier et tous les journaux
  if (noJournal) anomalies.push({ code: "C01", sev: "block", msg: "Sélectionnez au moins un journal." });
  if (!periodOk) anomalies.push({ code: "C01", sev: "block", msg: "La période doit être comprise dans un seul exercice (2025)." });
  if (kind === "fiscal" && !(allJournals && from === FY_FROM && to === FY_TO)) anomalies.push({ code: "C01", sev: "block", msg: "Le FEC Fiscal doit couvrir l'exercice entier et tous les journaux." });
  // C02 — Validation : jamais bloquante ; l'option « Écritures validées » décide si les DRAFT sont exportées
  const draftsIn = rows.filter((e) => e.status !== "V").length;
  if (periodOk && !noJournal && rows.length === 0) anomalies.push({ code: "C02", sev: "info", msg: (onlyValidated ? "Aucune écriture validée" : "Aucune écriture") + " sur ce périmètre — fichier exporté avec l'en-tête seul." });
  if (scope.length > rows.length) anomalies.push({ code: "C02", sev: "info", msg: (scope.length - rows.length) + " écriture(s) DRAFT non exportée(s) (option « Écritures validées » activée)." });
  if (draftsIn) anomalies.push(kind === "fiscal"
    ? { code: "C02", sev: "warn", msg: draftsIn + " écriture(s) DRAFT incluse(s) : un FEC ne doit contenir que des écritures validées (art. A. 47 A-1 LPF). Activez l'option « Écritures validées » pour un FEC conforme." }
    : { code: "C02", sev: "info", msg: draftsIn + " écriture(s) DRAFT incluse(s) (option « Écritures validées » désactivée) ; ValidDate vide pour ces lignes." });
  // C03 — Équilibre débit / crédit
  if (rows.length && Math.abs(d - c) >= 0.01) anomalies.push({ code: "C03", sev: "warn", msg: "Déséquilibre de " + formatNum(Math.abs(d - c)) + " € — à justifier dans le rapport." });
  // C04 — Invariance : totaux du fichier = totaux des écritures validées du SIC, par journal
  const byJournal = {};
  rows.forEach((e) => { const t = (byJournal[e.journal] = byJournal[e.journal] || { d: 0, c: 0, fd: 0, fc: 0 }); t.d += e.debit; t.c += e.credit; });
  lines.forEach(({ e }) => { const t = byJournal[e.journal]; t.fd += +fecAmount(e.debit).replace(",", "."); t.fc += +fecAmount(e.credit).replace(",", "."); });
  const variant = Object.keys(byJournal).filter((j) => Math.abs(byJournal[j].d - byJournal[j].fd) >= 0.005 || Math.abs(byJournal[j].c - byJournal[j].fc) >= 0.005);
  if (variant.length) anomalies.push({ code: "C04", sev: "block", msg: "Totaux du fichier différents des écritures du SIC pour : " + variant.join(", ") + "." });
  // C05 — TVA : montants des comptes 4457 inchangés (aucune règle ne les transforme)
  const vatChanged = lines.filter(({ e, m }) => e.account.startsWith("4457") && m.num !== e.account);
  if (vatChanged.length) anomalies.push({ code: "C05", sev: "warn", msg: vatChanged.length + " ligne(s) de TVA transformée(s) — contrôle par taux requis." });
  // C06 — Format : 18 champs, dates AAAAMMJJ
  const badFormat = lines.filter(({ e }) => !/^\d{4}-\d{2}-\d{2}$/.test(e.date) || (e.validDate && !/^\d{4}-\d{2}-\d{2}$/.test(e.validDate)));
  if (FEC_FIELDS.length !== 18 || badFormat.length) anomalies.push({ code: "C06", sev: "block", msg: "Format FEC invalide (" + badFormat.length + " date(s) non conforme(s))." });
  // C07 — Comptes : existence au plan comptable (pas de compte fantôme) ; FEC Analyse : chauffeur au référentiel
  const ghosts = [...new Set(rows.filter((e) => !ACCOUNT_NAMES[e.account]).map((e) => e.account))];
  if (ghosts.length) anomalies.push({ code: "C07", sev: "block", msg: "Compte(s) absent(s) du plan comptable : " + ghosts.join(", ") + "." });
  const unknown = lines.filter((l) => l.m.kind === "error");
  if (unknown.length) anomalies.push({ code: "C07", sev: "block", msg: unknown.length + " ligne(s) sans chauffeur au référentiel : " + [...new Set(unknown.map((l) => l.e.account))].join(", ") + ". Aucune conversion silencieuse (R05)." });
  if (ex.mode === "B") {
    const outOfScope = [...new Set(lines.filter((l) => l.m.kind === "same" && isDriverAccount(l.e.account)).map((l) => l.e.account))];
    if (outOfScope.length) anomalies.push({ code: "C07", sev: "info", msg: "Comptes chauffeur hors classe 7 recopiés à l'identique (point ouvert P3) : " + outOfScope.join(", ") });
  }
  // C09 — Séquence : FEC Fiscal = continuité sur l'exercice ; FEC Analyse = numéros DRAFT du périmètre (les autres journaux expliquent les autres écarts)
  if (rows.length && onlyValidated) {
    const nums = new Set(rows.map((e) => +e.num));
    const gaps = [];
    if (kind === "fiscal") { for (let i = 1; i <= Math.max(...nums); i++) if (!nums.has(i)) gaps.push(i); }
    else scope.filter((e) => e.status !== "V").forEach((e) => gaps.push(+e.num));
    if (gaps.length) anomalies.push({ code: "C09", sev: "info", msg: "Numéros EcritureNum absents : " + gaps.sort((x, y) => x - y).join(", ") + " — écritures DRAFT non exportées, justifiées par le journal d'audit." });
  }
  // C10 — Chronologie : PieceDate ≤ EcritureDate ≤ ValidDate
  const badDates = rows.filter((e) => e.validDate && e.validDate < e.date);
  if (badDates.length) anomalies.push({ code: "C10", sev: "warn", msg: badDates.length + " ligne(s) avec ValidDate antérieure à EcritureDate." });
  // C08 — Historique : archivage du fichier, du rapport et de l'empreinte SHA-256 à l'export (buildReport)
  // Le FEC Fiscal n'est jamais bloqué : toute anomalie bloquante devient une alerte
  if (kind === "fiscal") anomalies.forEach((x) => { if (x.sev === "block") x.sev = "warn"; });

  const byRoot = {};
  lines.filter((l) => l.m.kind === "mapped").forEach((l) => { byRoot[l.m.num] = (byRoot[l.m.num] || 0) + l.e.credit - l.e.debit; });

  const fileName = kind === "fiscal"
    ? SIREN + "FEC" + FY_TO.replace(/-/g, "") + ".txt"
    : "EXTRAIT_JOURNAUX_" + to.slice(0, 7).replace("-", "") + "_MODE_B.txt";
  const journalsLabel = allJournals ? "tous les journaux" : noJournal ? "aucun journal" : [...journals].join(", ");
  const scopeLabel = formatDate(from) + " → " + formatDate(to) + " · " + journalsLabel;
  return { kind, ex, from, to, rows, lines, d, c, drafts: scope.length - rows.length, draftsIn, onlyValidated, anomalies, byRoot, fileName, scopeLabel };
}

function buildFecFile(exp) {
  const body = exp.lines.map(({ e, m }) => [e.journal, JOURNAL_LIB[e.journal] || e.journal, e.num, formatFEC(e.date), m.num, m.lib, m.auxNum, m.auxLib, e.piece, formatFEC(e.date), e.label, fecAmount(e.debit), fecAmount(e.credit), e.lettre || "", "", formatFEC(e.validDate), "", ""].join("\t"));
  return "﻿" + [FEC_FIELDS.join("\t"), ...body].join("\n");
}

function buildReport(exp, sha) {
  const L = [];
  L.push("RAPPORT D'EXPORT — " + exp.ex.label + " — Stairling Union (SIREN " + SIREN + ")");
  L.push(exp.kind === "fiscal" ? "FEC réglementaire — exercice 2025 complet, tous journaux" : "Vue d'analyse (compte général + auxiliaire chauffeur) — EXTRAIT, ne constitue pas un FEC fiscal");
  L.push("Périmètre : " + exp.scopeLabel);
  L.push("Fichier : " + exp.fileName + "   SHA-256 : " + (sha || "indisponible"));
  L.push("Écritures / lignes exportées : " + new Set(exp.rows.map((e) => e.num)).size + " / " + exp.rows.length + "   DRAFT exclues : " + exp.drafts + "   DRAFT incluses : " + exp.draftsIn + "   (option « Écritures validées » " + (exp.onlyValidated ? "activée" : "désactivée") + ")");
  L.push("Total débit : " + formatNum(exp.d) + "   Total crédit : " + formatNum(exp.c));
  if (exp.kind === "analyse") {
    L.push("Version des règles de mapping : " + MAP_VERSION);
    L.push("", "Totaux par compte général (non ajoutés au FEC) :");
    Object.keys(exp.byRoot).sort().forEach((r) => L.push("  " + r + " = " + formatNum(exp.byRoot[r])));
    L.push("", "Journal d'audit ligne source → ligne sortie (R06) :");
    exp.lines.forEach(({ e, m }) => L.push("  #" + e.num + "  " + e.account + " → " + m.num + (m.auxNum ? " / " + m.auxNum : "") + "  [" + m.kind + "]"));
  }
  L.push("", "Anomalies :");
  if (!exp.anomalies.length) L.push("  aucune");
  exp.anomalies.forEach((a) => L.push("  [" + a.code + "] " + SEV[a.sev].l + " — " + a.msg));
  L.push("", "Généré le " + new Date().toLocaleString("fr-FR") + " par Utilisateur démo");
  return L.join("\n");
}

// Groupe de boutons [FEC Fiscal | FEC Analyse] — chaque bouton exporte directement ;
// un encart n'apparaît sous le groupe qu'en cas d'avertissement ou de blocage
function FecExportButtons({ sel, onDone }) {
  const [pending, setPending] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!pending) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setPending(null); };
    const onKey = (e) => { if (e.key === "Escape") setPending(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [pending]);

  const run = async (exp) => {
    const file = buildFecFile(exp);
    const sha = await sha256Hex(file);
    download(exp.fileName, file, "text/plain;charset=utf-8");
    setPending(null);
    onDone({ fileName: exp.fileName, sha, kind: exp.kind, lines: exp.rows.length, drafts: exp.drafts, draftsIn: exp.draftsIn, report: buildReport(exp, sha) });
  };

  const click = (kind) => {
    const exp = computeExport(kind, sel);
    if (exp.anomalies.some((a) => a.sev !== "info")) setPending(exp);
    else run(exp);
  };

  const downloadReport = async (exp) => {
    const sha = await sha256Hex(buildFecFile(exp));
    download(exp.fileName.replace(".txt", "_RAPPORT.txt"), buildReport(exp, sha), "text/plain;charset=utf-8");
  };

  const partial = sel.from !== FY_FROM || sel.to !== FY_TO || sel.journals.size !== 0;
  const tip = {
    fiscal: "FEC réglementaire pour l'administration fiscale — exercice 2025 complet, tous les journaux. Indépendant des filtres affichés, sauf l'option « Écritures validées » qui décide si les DRAFT sont exportées.",
    analyse: "Vue d'analyse au format FEC — période et journaux affichés, compte général + auxiliaire chauffeur. Ne pas transmettre à l'administration.",
  };
  const btn = (kind, active) => ({
    padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "none",
    display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s",
    background: kind === "fiscal" ? (active ? "#fdf3d6" : GOLD + "12") : (active ? "#fef3c7" : "#fff"),
    color: kind === "fiscal" ? "#8b6914" : "#92400e",
  });
  const blocking = pending && pending.anomalies.some((a) => a.sev === "block");
  const shown = pending ? pending.anomalies.filter((a) => a.sev !== "info") : [];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div role="group" aria-label="Export FEC" style={{ display: "inline-flex", borderRadius: 5, overflow: "hidden", border: "1px solid " + GOLD }}>
        <button title={tip.fiscal} onClick={() => click("fiscal")} style={btn("fiscal", pending?.kind === "fiscal")}>📄 FEC Fiscal</button>
        <div style={{ width: 1, background: GOLD }} />
        <button title={tip.analyse} onClick={() => click("analyse")} style={btn("analyse", pending?.kind === "analyse")}>
          📊 FEC Analyse
          {partial && <span style={{ padding: "0 5px", borderRadius: 8, fontSize: 8, fontWeight: 700, background: AMBER + "22", color: "#92400e" }}>sélection</span>}
        </button>
      </div>

      {pending && (
        <div role="dialog" aria-label={pending.ex.label} style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 440, background: "#faf9f6", border: "1.5px solid " + (blocking ? RED : AMBER), borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 60, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>{pending.ex.icon} {pending.ex.label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: blocking ? RED : AMBER }}>{blocking ? "Export impossible" : shown.length + " avertissement(s)"}</span>
          </div>
          <div style={{ fontSize: 10, color: MUTED, margin: "3px 0 8px" }}>
            {pending.scopeLabel} · <span style={{ fontFamily: "monospace", color: DARK }}>{pending.fileName}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            {shown.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 6, padding: "5px 8px", borderRadius: 5, background: SEV[a.sev].bg, border: "1px solid " + SEV[a.sev].bd, fontSize: 10 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 800, color: SEV[a.sev].c, whiteSpace: "nowrap" }}>{a.code}</span>
                <span>{a.msg}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button onClick={() => setPending(null)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e" }}>Annuler</button>
            <button onClick={() => downloadReport(pending)} style={{ padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e" }}>Rapport</button>
            {!blocking && (
              <button onClick={() => run(pending)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + (pending.kind === "fiscal" ? GOLD : AMBER), background: pending.kind === "fiscal" ? GOLD : AMBER, color: pending.kind === "fiscal" ? DARK : "#fff" }}>Exporter quand même</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ on, onToggle, label }) {
  return (
    <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 5, fontSize: 9, fontWeight: 600, cursor: "pointer", border: "1.5px solid " + (on ? GOLD : BORDER), background: on ? GOLD + "10" : "#fff", color: on ? GOLD : MUTED, transition: "all 0.12s", userSelect: "none" }}>
      <div style={{ width: 24, height: 14, borderRadius: 7, background: on ? GOLD : BORDER, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: 5, background: "#fff", position: "absolute", top: 2, left: on ? 12 : 2, transition: "left 0.15s" }} />
      </div>
      {label}
    </div>
  );
}

function JournalDropdown({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allCodes = JOURNALS.map((j) => j.code);
  const isAll = selected.size === 0;

  const toggleOne = (code) => {
    if (selected.has("__NONE__")) {
      onChange(new Set([code]));
    } else if (isAll) {
      const next = new Set(allCodes);
      next.delete(code);
      onChange(next);
    } else {
      const next = new Set(selected);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      if (next.size === 0) onChange(new Set(["__NONE__"]));
      else if (next.size === allCodes.length) onChange(new Set());
      else onChange(next);
    }
  };

  const selectAll = () => {
    if (isAll) onChange(new Set(["__NONE__"]));
    else onChange(new Set());
  };

  const isNone = selected.has("__NONE__");
  const labelText = isNone
    ? "Aucun journal"
    : isAll
    ? "Tous les journaux"
    : selected.size === 1
    ? JOURNAL_LIB[[...selected][0]] || [...selected][0]
    : selected.size + " journaux";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid " + GOLD, fontSize: 11, fontWeight: 700, background: "#fff", color: DARK, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{labelText}</span>
        {!isAll && <span style={{ padding: "1px 6px", borderRadius: 10, fontSize: 9, fontWeight: 700, background: GOLD + "22", color: "#8b6914" }}>{selected.size}</span>}
        <span style={{ color: GOLD, fontSize: 9 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: 300, background: "#fff", border: "1.5px solid " + GOLD, borderRadius: 8, maxHeight: 280, overflowY: "auto", zIndex: 50, boxShadow: "0 6px 20px rgba(0,0,0,0.14)" }}>
          <div onClick={selectAll} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid " + BORDER, fontStyle: "italic", color: FAINT }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid " + GOLD, background: isAll ? GOLD : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: DARK, flexShrink: 0 }}>{isAll ? "✓" : ""}</div>
            <span style={{ fontSize: 10 }}>Tous</span>
          </div>
          {JOURNALS.map((j, i) => {
            const checked = isAll || selected.has(j.code);
            return (
              <div key={j.code} onClick={() => toggleOne(j.code)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", cursor: "pointer", borderBottom: "0.5px solid #f0ece3", background: checked ? (i % 2 ? GOLD + "18" : GOLD + "0d") : (i % 2 ? "#faf9f6" : "#fff"), transition: "background 0.08s" }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid " + (checked ? GOLD : BORDER), background: checked ? GOLD : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: DARK, flexShrink: 0 }}>{checked ? "✓" : ""}</div>
                <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: checked ? DARK : MUTED, minWidth: 80 }}>{j.code}</span>
                <span style={{ fontSize: 10, color: checked ? DARK : FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.lib}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortIcon({ column, sortCol, sortDir }) {
  if (sortCol !== column) return <span style={{ opacity: 0.25, fontSize: 9 }}> ⇅</span>;
  return <span style={{ color: "#1c1917", fontSize: 9 }}>{" "}{sortDir === "asc" ? "▲" : "▼"}</span>;
}

export default function JournalEcritures() {
  const [selJournals, setSelJournals] = useState(new Set());
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState("2025-12-31");
  const [monthPhase, setMonthPhase] = useState(0);
  const [monthFirst, setMonthFirst] = useState(-1);
  const [onlyValidated, setOnlyValidated] = useState(false);
  const [onlyLettered, setOnlyLettered] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(5);
  const [notif, setNotif] = useState(null);
  const [exportNotif, setExportNotif] = useState(null);

  const isAllJournals = selJournals.size === 0;
  const monthStart = MONTHS.findIndex((m) => m.f === dateFrom);
  const monthEnd = MONTHS.findIndex((m) => m.t === dateTo);

  const handleMonthClick = (i) => {
    if (monthPhase === 0) {
      setDateFrom(MONTHS[i].f);
      setDateTo(MONTHS[i].t);
      setMonthPhase(1);
      setMonthFirst(i);
      setPage(0);
    } else {
      const s = Math.min(i, monthFirst);
      const e = Math.max(i, monthFirst);
      setDateFrom(MONTHS[s].f);
      setDateTo(MONTHS[e].t);
      setMonthPhase(0);
      setMonthFirst(-1);
      setPage(0);
    }
  };

  const filtered = useMemo(() => {
    let f = [...ENTRIES];
    if (selJournals.has("__NONE__")) f = [];
    else if (!isAllJournals) f = f.filter((e) => selJournals.has(e.journal));
    if (onlyValidated) f = f.filter((e) => e.status === "V");
    if (onlyLettered) f = f.filter((e) => e.lettre !== "");
    if (dateFrom) f = f.filter((e) => e.date >= dateFrom);
    if (dateTo) f = f.filter((e) => e.date <= dateTo);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter((e) => e.account.toLowerCase().includes(q) || (ACCOUNT_NAMES[e.account] || "").toLowerCase().includes(q) || e.label.toLowerCase().includes(q) || e.piece.toLowerCase().includes(q) || e.num.toLowerCase().includes(q));
    }
    f.sort((a, b) => {
      let va = a[sortCol] || "";
      let vb = b[sortCol] || "";
      if (sortCol === "debit" || sortCol === "credit") { va = va || 0; vb = vb || 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return f;
  }, [selJournals, isAllJournals, onlyValidated, onlyLettered, dateFrom, dateTo, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice(page * perPage, (page + 1) * perPage);

  const totals = useMemo(() => {
    let d = 0, c = 0, nl = 0, le = 0;
    filtered.forEach((e) => { d += e.debit; c += e.credit; if (e.lettre) le++; else nl++; });
    return { d, c, bal: d - c, ok: Math.abs(d - c) < 0.01, le, nl, accts: new Set(filtered.map((e) => e.account)).size };
  }, [filtered]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((v) => (v === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  // Export FEC : groupe [FEC Fiscal | FEC Analyse] dans la barre d'outils
  const onExported = useCallback((h) => {
    setExportNotif(h);
    setTimeout(() => setExportNotif((n) => (n === h ? null : n)), 8000);
  }, []);

  const exportCSV = useCallback(() => {
    const header = ["N° Écriture", "Date", "Journal", "N° Compte", "Libellé Compte", "Pièce", "Libellé", "Débit", "Crédit", "Lettrage"].join(";");
    const lines = filtered.map((e) => [e.num, formatDate(e.date), e.journal, e.account, ACCOUNT_NAMES[e.account] || "", e.piece, e.label, e.debit ? e.debit.toFixed(2).replace(".", ",") : "", e.credit ? e.credit.toFixed(2).replace(".", ",") : "", e.lettre].join(";"));
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "journal_ecritures.csv"; a.click();
    URL.revokeObjectURL(url);
    setNotif("CSV exporté"); setTimeout(() => setNotif(null), 3000);
  }, [filtered]);

  const COLS = [
    { key: "num", label: "N° écriture", w: 88 },
    { key: "date", label: "Date", w: 76 },
    { key: "journal", label: "Journal", w: 80 },
    { key: "account", label: "N° compte", w: 100 },
    { key: "accountLib", label: "Libellé compte", noSort: true },
    { key: "piece", label: "Pièce", w: 105 },
    { key: "label", label: "Libellé écriture", noSort: true },
    { key: "debit", label: "Débit", w: 85, right: true },
    { key: "credit", label: "Crédit", w: 85, right: true },
    { key: "lettre", label: "Let.", w: 36 },
  ];

  return (
    <div style={{ fontFamily: "DM Sans, system-ui, sans-serif", background: "#f0ede6", minHeight: "100vh", color: DARK }}>

      {/* HEADER */}
      <div style={{ background: DARK, color: "#faf9f6", padding: "14px 22px", borderBottom: "3px solid " + GOLD, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: "linear-gradient(135deg, " + GOLD + ", #e8d48b)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: DARK }}>SU</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Journal des écritures comptables</div>
            <div style={{ fontSize: 10, color: "#a8a29e", marginTop: 1 }}>Stairling Union · Exercice 2025</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: "#a8a29e", cursor: "pointer" }}>? Aide</div>
      </div>

      <div style={{ padding: "14px 22px" }}>
        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: "Comptes", v: totals.accts, c: DARK },
            { l: "Total débit", v: formatNum(totals.d) + " €", c: DARK },
            { l: "Total crédit", v: formatNum(totals.c) + " €", c: DARK },
            { l: "Lettrées", v: totals.le, c: GREEN },
            { l: "Non lettrées", v: totals.nl, c: RED },
          ].map((k, i) => (
            <div key={i} style={{ background: "#faf9f6", borderRadius: 7, border: "1px solid #e8e4db", padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: FAINT, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.c, marginTop: 3 }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* PÉRIODE */}
        <div style={{ background: "#faf9f6", borderRadius: 8, border: "1px solid #e8e4db", padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, minWidth: 55 }}>Période</span>
            <span style={{ fontSize: 10, color: FAINT }}>Du</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); setMonthPhase(0); }} style={{ padding: "5px 8px", borderRadius: 5, border: "1.5px solid " + BORDER, fontSize: 10, fontFamily: "inherit", background: "#fff", color: DARK, outline: "none" }} />
            <span style={{ fontSize: 10, color: FAINT }}>au</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); setMonthPhase(0); }} style={{ padding: "5px 8px", borderRadius: 5, border: "1.5px solid " + BORDER, fontSize: 10, fontFamily: "inherit", background: "#fff", color: DARK, outline: "none" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, minWidth: 55, flexShrink: 0 }}>Mois</span>
            <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", border: "1.5px solid " + BORDER, flex: 1 }}>
              {MONTHS.map((m, i) => {
                const isEdge = i === monthStart || i === monthEnd;
                const inRange = i >= monthStart && i <= monthEnd && monthStart >= 0 && monthEnd >= 0;
                return (
                  <div key={i} onClick={() => handleMonthClick(i)} style={{ padding: "5px 0", textAlign: "center", cursor: "pointer", userSelect: "none", flex: 1, minWidth: 38, borderRight: i < 11 ? "0.5px solid #e8e4db" : "none", background: isEdge ? GOLD : inRange ? GOLD + "20" : "#fff", color: isEdge ? "#fff" : inRange ? "#8b6914" : MUTED, fontWeight: inRange ? 700 : 400, fontSize: 11, transition: "all 0.12s" }}>
                    {m.l}
                  </div>
                );
              })}
            </div>
          </div>
          {monthPhase === 1 && <div style={{ fontSize: 9, color: GOLD, fontWeight: 600, fontStyle: "italic", marginBottom: 4, marginLeft: 55 }}>Cliquez un 2e mois pour définir la fin de période</div>}

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, minWidth: 55, flexShrink: 0 }}>Trim.</span>
            {TRIMS.map((t, i) => {
              const active = dateFrom === t.f && dateTo === t.t;
              return (
                <button key={i} onClick={() => { setDateFrom(t.f); setDateTo(t.t); setMonthPhase(0); setPage(0); }} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit", border: "1.5px solid " + (active ? GOLD : BORDER), background: active ? GOLD : "#fff", color: active ? "#fff" : "#57534e", transition: "all 0.12s" }}>
                  {t.l}
                </button>
              );
            })}
            {(dateFrom !== "2025-01-01" || dateTo !== "2025-12-31") && (
              <button onClick={() => { setDateFrom("2025-01-01"); setDateTo("2025-12-31"); setMonthPhase(0); setPage(0); }} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1.5px solid #dc2626", background: "transparent", color: "#dc2626", marginLeft: 4 }}>✕ Réinit.</button>
            )}
          </div>
        </div>

        {/* OPTIONS */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3 }}>Options</span>
          <ToggleSwitch on={onlyValidated} onToggle={() => { setOnlyValidated((v) => !v); setPage(0); }} label="Écritures validées" />
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <ToggleSwitch on={onlyLettered} onToggle={() => { setOnlyLettered((v) => !v); setPage(0); }} label="Lettrées seulement" />
        </div>

        {/* JOURNAL + RECHERCHER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
          <JournalDropdown selected={selJournals} onChange={(s) => { setSelJournals(s); setPage(0); }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 }}>Rechercher</span>
            <input type="text" placeholder="Filtrer par compte…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} style={{ padding: "5px 10px", borderRadius: 5, border: "1.5px solid " + (search ? GOLD : BORDER), fontSize: 11, fontFamily: "inherit", outline: "none", background: "#fff", width: 180, boxSizing: "border-box" }} />
          </div>
        </div>

        {/* COMPTEUR + PAR PAGE + EXPORTS — style balance */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #e8e4db", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11, color: MUTED }}>
            Lignes {filtered.length > 0 ? (page * perPage + 1) + "–" + Math.min((page + 1) * perPage, filtered.length) : "0"} sur {filtered.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: FAINT }}>Par page :</span>
            {[5, 10, 20].map((n) => (
              <button key={n} onClick={() => { setPerPage(n); setPage(0); }} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: perPage === n ? 700 : 500, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + (perPage === n ? DARK : BORDER), background: perPage === n ? DARK : "transparent", color: perPage === n ? "#fff" : "#57534e" }}>{n}</button>
            ))}
            <div style={{ width: 1, height: 16, background: BORDER, margin: "0 4px" }} />
            <button onClick={() => window.print()} onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f3ee"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e", display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s" }}>🖨 Imprimer</button>
            <FecExportButtons sel={{ from: dateFrom, to: dateTo, journals: selJournals, onlyValidated }} onDone={onExported} />
          </div>
        </div>

        {/* TABLEAU */}
        <div style={{ borderRadius: 8, border: "1px solid #e8e4db", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, background: "#faf9f6" }}>
            <thead>
              <tr style={{ background: "#f0ede6", borderBottom: "2px solid " + GOLD }}>
                {COLS.map((h) => (
                  <th key={h.key} onClick={() => !h.noSort && handleSort(h.key)} style={{ padding: "8px 6px", textAlign: h.right ? "right" : "left", color: "#78716c", fontWeight: 700, fontSize: 9, letterSpacing: 0.4, textTransform: "uppercase", cursor: h.noSort ? "default" : "pointer", whiteSpace: "nowrap", width: h.w || undefined, userSelect: "none" }}>
                    {h.label}
                    {!h.noSort && <SortIcon column={h.key} sortCol={sortCol} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: FAINT, fontSize: 12 }}>Aucune écriture pour cette sélection</td></tr>
              )}
              {pageRows.map((entry, idx) => {
                const isDraft = entry.status === "D";
                return (
                  <tr key={entry.id + "-" + idx} style={{ borderBottom: "1px solid #e8e4db", background: isDraft ? (idx % 2 === 0 ? "#fffbeb" : "#fef9e0") : (idx % 2 === 0 ? "#faf9f6" : "#f5f0e8") }}>
                    <td style={{ padding: "5px 6px", fontFamily: "monospace", fontSize: 10, fontWeight: 600, color: MUTED, whiteSpace: "nowrap" }}>
                      {entry.num}
                      {isDraft && <span style={{ marginLeft: 4, padding: "1px 4px", borderRadius: 3, fontSize: 8, fontWeight: 700, background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" }}>DRAFT</span>}
                    </td>
                    <td style={{ padding: "5px 6px", fontFamily: "monospace", fontSize: 10 }}>{formatDate(entry.date)}</td>
                    <td style={{ padding: "5px 6px" }}>
                      <span style={{ padding: "1px 5px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: GOLD + "18", color: "#92700a", fontFamily: "monospace" }}>{entry.journal}</span>
                    </td>
                    <td style={{ padding: "5px 6px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: getAccountColor(entry.account) }}>{entry.account}</span>
                    </td>
                    <td style={{ padding: "5px 6px", fontSize: 10, color: "#57534e", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ACCOUNT_NAMES[entry.account] || entry.account}</td>
                    <td style={{ padding: "5px 6px", fontFamily: "monospace", fontSize: 9, color: MUTED }}>{entry.piece}</td>
                    <td style={{ padding: "5px 6px", fontSize: 10, color: DARK, maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.label}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontFamily: "monospace", fontSize: 10, fontWeight: entry.debit > 0 ? 700 : 400, color: entry.debit > 0 ? GREEN : "#d6d3d1" }}>{entry.debit > 0 ? formatNum(entry.debit) : "—"}</td>
                    <td style={{ padding: "5px 6px", textAlign: "right", fontFamily: "monospace", fontSize: 10, fontWeight: entry.credit > 0 ? 700 : 400, color: entry.credit > 0 ? RED : "#d6d3d1" }}>{entry.credit > 0 ? formatNum(entry.credit) : "—"}</td>
                    <td style={{ padding: "5px 6px", textAlign: "center" }}>
                      {entry.lettre && <span style={{ padding: "1px 4px", borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: "monospace", background: "#dbeafe", color: "#1d4ed8" }}>{entry.lettre}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Ligne TOTAUX — style balance : fond crème, bordure haute dorée */}
              <tr style={{ background: "#f0ede6", fontWeight: 800, borderTop: "2px solid " + GOLD }}>
                <td colSpan={7} style={{ padding: "7px 10px", textAlign: "right", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: MUTED }}>TOTAUX ({totals.accts} comptes)</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: GREEN, fontVariantNumeric: "tabular-nums" }}>{formatNum(totals.d)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: RED, fontVariantNumeric: "tabular-nums" }}>{formatNum(totals.c)}</td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: MUTED }}>{totals.le + totals.nl}</td>
              </tr>
              {/* Ligne BALANCE — style balance */}
              <tr style={{ background: "#f0ede6" }}>
                <td colSpan={10} style={{ padding: "6px 10px", textAlign: "center", fontFamily: "monospace", fontSize: 11, fontWeight: 800, color: totals.ok ? GREEN : RED, borderTop: "1px solid " + BORDER }}>
                  {totals.ok ? "✓ Équilibre — Écart : 0,00 €" : "✗ Déséquilibre — Écart : " + formatNum(Math.abs(totals.bal)) + " €"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PAGINATION — en dehors du tableau, style balance */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div style={{ fontSize: 11, color: MUTED }}>Page {page + 1} sur {totalPages} · {filtered.length} lignes</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid " + BORDER, background: page === 0 ? "#f5f3ee" : "#fff", color: page === 0 ? BORDER : DARK, fontSize: 11, fontWeight: 600, cursor: page === 0 ? "default" : "pointer", fontFamily: "inherit" }}>← Précédent</button>
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                const p = totalPages <= 8 ? i : (page < 4 ? i : page > totalPages - 5 ? totalPages - 8 + i : page - 3 + i);
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + (page === p ? DARK : BORDER), background: page === p ? DARK : "#fff", color: page === p ? "#fff" : "#57534e", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center" }}>{p + 1}</button>
                );
              })}
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid " + BORDER, background: page >= totalPages - 1 ? "#f5f3ee" : "#fff", color: page >= totalPages - 1 ? BORDER : DARK, fontSize: 11, fontWeight: 600, cursor: page >= totalPages - 1 ? "default" : "pointer", fontFamily: "inherit" }}>Suivant →</button>
            </div>
          </div>
        )}

        {/* LÉGENDE — style balance */}
        <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 10, color: "#a8a29e", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 11, height: 11, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2, display: "inline-block" }} />Débit</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 11, height: 11, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 2, display: "inline-block" }} />Crédit</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ padding: "0 3px", background: "#dbeafe", color: "#1d4ed8", borderRadius: 2, fontWeight: 700, fontFamily: "monospace", fontSize: 9 }}>AA</span>Lettrée</span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 11, height: 11, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 2, display: "inline-block" }} />DRAFT = non validée</span>
          <span style={{ marginLeft: "auto", fontWeight: 600 }}>FEC : 123456789FEC20251231.txt — Art. L47 A-I LPF</span>
        </div>

      </div>

      {exportNotif && (
        <div style={{ position: "fixed", bottom: 18, right: 18, background: DARK, color: "#faf9f6", padding: "10px 14px", borderRadius: 8, fontSize: 11, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid " + (exportNotif.kind === "fiscal" ? GREEN : AMBER), display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: exportNotif.kind === "fiscal" ? GREEN : "#fbbf24", fontWeight: 700 }}>✓ {exportNotif.kind === "fiscal" ? "FEC Fiscal exporté" : "FEC Analyse exporté"}</span>
          <span style={{ fontFamily: "monospace", fontSize: 10 }}>{exportNotif.fileName}{exportNotif.sha ? " · SHA-256 " + exportNotif.sha.slice(0, 8) + "…" : ""}</span>
          <span style={{ fontSize: 10, color: FAINT }}>{exportNotif.lines} ligne(s){exportNotif.drafts ? " · " + exportNotif.drafts + " DRAFT non exportée(s)" : ""}{exportNotif.draftsIn ? " · dont " + exportNotif.draftsIn + " DRAFT" : ""}</span>
          <span onClick={() => download(exportNotif.fileName.replace(".txt", "_RAPPORT.txt"), exportNotif.report, "text/plain;charset=utf-8")} style={{ color: GOLD, cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>Rapport</span>
          <span onClick={() => setExportNotif(null)} style={{ color: FAINT, cursor: "pointer" }}>✕</span>
        </div>
      )}


      {notif && (
        <div style={{ position: "fixed", bottom: 18, right: 18, background: DARK, color: GREEN, padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid " + GREEN }}>✓ {notif}</div>
      )}
    </div>
  );
}
