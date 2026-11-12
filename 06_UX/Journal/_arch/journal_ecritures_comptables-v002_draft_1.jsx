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

// Racines autorisées pour le mode B (R01 : la plus longue l'emporte)
const MAP_ROOTS = [
  { root: "70611", lib: "Ventes de courses Uber 10 %" }, { root: "70612", lib: "Ventes Uber 20 %" },
  { root: "70621", lib: "Ventes de courses Bolt 10 %" }, { root: "70631", lib: "Ventes de courses Heetch 10 %" },
  { root: "70641", lib: "Ventes de courses FreeNow 10 %" },
].sort((a, b) => b.root.length - a.root.length);

// Référentiel chauffeurs (R02 : le suffixe est identifié ici, jamais deviné)
const DRIVERS = { DUPONT: "Chauffeur DUPONT", XAVIER: "Chauffeur XAVIER", KARIM: "Chauffeur KARIM" };

const EXPORT_MODES = {
  A: { title: "Administration fiscale", sub: "FEC réglementaire · comptes d'origine", badge: "Par défaut" },
  B: { title: "Analyse des comptes", sub: "Compte général + auxiliaire chauffeur", badge: "Non fiscal" },
};

const fecAmount = (n) => (n ? n.toFixed(2).replace(".", ",") : "0,00");

// Résout le compte FEC d'une ligne selon le mode
function mapAccount(account, mode) {
  const lib = ACCOUNT_NAMES[account] || account;
  if (mode === "A") return { num: account, lib, auxNum: "", auxLib: "", kind: "same" };
  const rule = MAP_ROOTS.find((r) => account.startsWith(r.root) && account.length > r.root.length);
  if (!rule) return { num: account, lib, auxNum: "", auxLib: "", kind: "same" };
  const suffix = account.slice(rule.root.length);
  if (!DRIVERS[suffix]) return { num: account, lib, auxNum: "", auxLib: "", kind: "error" };
  return { num: rule.root, lib: rule.lib, auxNum: suffix, auxLib: DRIVERS[suffix], kind: "mapped" };
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

function ExportFECModal({ initFrom, initTo, initJournals, history, onExported, onClose }) {
  const [mode, setMode] = useState("A");
  const [from, setFrom] = useState(initFrom);
  const [to, setTo] = useState(initTo);
  const [journals, setJournals] = useState(initJournals);
  const [ack, setAck] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => { setAck(false); }, [mode, from, to, journals]);

  const noJournal = journals.has("__NONE__");
  const allJournals = journals.size === 0;
  const inJournals = (e) => !noJournal && (allJournals || journals.has(e.journal));
  const inPeriod = (e) => e.date >= from && e.date <= to;
  const periodOk = from && to && from <= to && from >= FY_FROM && to <= FY_TO;
  const complete = periodOk && from === FY_FROM && to === FY_TO && allJournals;

  const exp = useMemo(() => {
    // Sélection : écritures validées uniquement ; recherche, lettrage et tri de l'écran ignorés
    const scope = ENTRIES.filter((e) => inJournals(e) && inPeriod(e));
    const rows = scope.filter((e) => e.status === "V")
      .sort((a, b) => (a.validDate + a.num.padStart(8, "0")).localeCompare(b.validDate + b.num.padStart(8, "0")));
    const drafts = scope.length - rows.length;
    const lines = rows.map((e) => ({ e, m: mapAccount(e.account, mode) }));
    let d = 0, c = 0;
    rows.forEach((e) => { d += e.debit; c += e.credit; });
    const usedJournals = [...new Set(rows.map((e) => e.journal))].sort();

    const anomalies = [];
    if (noJournal) anomalies.push({ code: "C01", sev: "block", msg: "Sélectionnez au moins un journal." });
    if (!periodOk) anomalies.push({ code: "C01", sev: "block", msg: "La période doit être comprise dans un seul exercice (2025)." });
    if (periodOk && !noJournal && rows.length === 0) anomalies.push({ code: "C02", sev: "block", msg: "Aucune écriture validée sur cette période." });
    if (rows.length && Math.abs(d - c) >= 0.01) anomalies.push({ code: "C03", sev: "warn", msg: "Déséquilibre de " + formatNum(Math.abs(d - c)) + " € sur la sélection — à justifier dans le rapport." });
    const unknown = lines.filter((l) => l.m.kind === "error");
    if (unknown.length) anomalies.push({ code: "C07", sev: "block", msg: unknown.length + " ligne(s) sans chauffeur au référentiel : " + [...new Set(unknown.map((l) => l.e.account))].join(", ") + ". Aucune conversion silencieuse (R05)." });
    if (mode === "B") {
      const outOfScope = [...new Set(lines.filter((l) => l.m.kind === "same" && isDriverAccount(l.e.account)).map((l) => l.e.account))];
      if (outOfScope.length) anomalies.push({ code: "C07", sev: "info", msg: "Comptes chauffeur hors classe 7 recopiés à l'identique (point ouvert D3) : " + outOfScope.slice(0, 6).join(", ") + (outOfScope.length > 6 ? "…" : "") });
    }
    if (complete && rows.length) {
      const nums = new Set(rows.map((e) => +e.num));
      const max = Math.max(...nums);
      const gaps = [];
      for (let i = 1; i <= max; i++) if (!nums.has(i)) gaps.push(i);
      if (gaps.length) anomalies.push({ code: "C09", sev: "warn", msg: "Trous de séquence EcritureNum : " + gaps.join(", ") + " — écritures DRAFT non exportées, justifiées par le journal d'audit." });
    }
    const badDates = rows.filter((e) => e.validDate && e.validDate < e.date);
    if (badDates.length) anomalies.push({ code: "C10", sev: "warn", msg: badDates.length + " ligne(s) avec ValidDate antérieure à EcritureDate." });

    // Totaux par racine (mode B) — affichés dans le rapport, jamais ajoutés au FEC
    const byRoot = {};
    lines.filter((l) => l.m.kind === "mapped").forEach((l) => { byRoot[l.m.num] = (byRoot[l.m.num] || 0) + l.e.credit - l.e.debit; });

    const checks = [
      ["C01", "Sélection", !anomalies.some((a) => a.code === "C01")],
      ["C02", "Exhaustivité", rows.length > 0],
      ["C03", "Équilibre", Math.abs(d - c) < 0.01],
      ["C04", "Invariance", true],
      ["C05", "TVA", true],
      ["C06", "Format", true],
      ["C07", "Mapping", unknown.length === 0],
      ["C08", "Historique", true],
      ["C09", "Séquence", !anomalies.some((a) => a.code === "C09")],
      ["C10", "Chronologie", badDates.length === 0],
    ];
    return { rows, lines, drafts, d, c, usedJournals, anomalies, byRoot, checks };
  }, [mode, from, to, journals]);

  const blocking = exp.anomalies.some((a) => a.sev === "block");
  const warnings = exp.anomalies.some((a) => a.sev === "warn");
  const canExport = !blocking && (!warnings || ack);
  const fileName = complete && mode === "A"
    ? SIREN + "FEC" + FY_TO.replace(/-/g, "") + ".txt"
    : "EXTRAIT_JOURNAUX_" + to.slice(0, 7).replace("-", "") + "_MODE_" + mode + ".txt";

  const buildFile = () => {
    const header = FEC_FIELDS.join("\t");
    const body = exp.lines.map(({ e, m }) => [e.journal, JOURNAL_LIB[e.journal] || e.journal, e.num, formatFEC(e.date), m.num, m.lib, m.auxNum, m.auxLib, e.piece, formatFEC(e.date), e.label, fecAmount(e.debit), fecAmount(e.credit), e.lettre || "", "", formatFEC(e.validDate), "", ""].join("\t"));
    return "﻿" + [header, ...body].join("\n");
  };

  const buildReport = (sha) => {
    const L = [];
    L.push("RAPPORT D'EXPORT FEC — Stairling Union");
    L.push("Société : Stairling Union (SIREN " + SIREN + ")   Exercice : 2025");
    L.push("Mode : " + mode + " — " + EXPORT_MODES[mode].title + (mode === "B" ? " (vue remappée, ne constitue pas un FEC fiscal)" : ""));
    L.push("Nature : " + (complete ? "FEC complet" : "EXTRAIT — ne constitue pas un FEC annuel complet"));
    L.push("Période : " + formatDate(from) + " → " + formatDate(to));
    L.push("Journaux : " + (allJournals ? "tous" : [...journals].join(", ")));
    L.push("Fichier : " + fileName + "   SHA-256 : " + (sha || "indisponible"));
    L.push("Écritures / lignes exportées : " + new Set(exp.rows.map((e) => e.num)).size + " / " + exp.rows.length + "   DRAFT exclues : " + exp.drafts);
    L.push("Total débit : " + formatNum(exp.d) + "   Total crédit : " + formatNum(exp.c));
    if (mode === "B") {
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
  };

  const doExport = async () => {
    const file = buildFile();
    const sha = await sha256Hex(file);
    download(fileName, file, "text/plain;charset=utf-8");
    onExported({ fileName, sha, mode, complete, at: new Date().toLocaleTimeString("fr-FR"), report: buildReport(sha) });
  };

  const downloadReport = async () => {
    const sha = await sha256Hex(buildFile());
    download(fileName.replace(".txt", "_RAPPORT.txt"), buildReport(sha), "text/plain;charset=utf-8");
  };

  const label = { fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, minWidth: 74, flexShrink: 0 };
  const dateInput = { padding: "5px 8px", borderRadius: 5, border: "1.5px solid " + (periodOk ? BORDER : RED), fontSize: 10, fontFamily: "inherit", background: "#fff", color: DARK, outline: "none" };
  // Aperçu : lignes de vente chauffeur en tête pour rendre visible la différence entre les modes
  const isSale = (l) => MAP_ROOTS.some((r) => l.e.account.startsWith(r.root));
  const preview = showAll ? exp.lines : [...exp.lines.filter(isSale), ...exp.lines.filter((l) => !isSale(l))].slice(0, 6);

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 12 }}>
      <div role="dialog" aria-modal="true" aria-label="Export FEC" style={{ width: 820, maxWidth: "100%", maxHeight: "94vh", display: "flex", flexDirection: "column", background: "#faf9f6", borderRadius: 10, overflow: "hidden", boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>

        {/* EN-TÊTE */}
        <div style={{ background: DARK, color: "#faf9f6", padding: "12px 18px", borderBottom: "3px solid " + GOLD, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Export FEC</div>
            <div style={{ fontSize: 10, color: FAINT, marginTop: 1 }}>Stairling Union · Exercice 2025 · Art. A. 47 A-1 LPF</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "transparent", border: "none", color: FAINT, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ padding: "14px 18px", overflowY: "auto" }}>

          {/* MODE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {["A", "B"].map((k) => {
              const on = mode === k;
              const col = k === "A" ? GOLD : AMBER;
              return (
                <div key={k} role="radio" aria-checked={on} tabIndex={0} onClick={() => setMode(k)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setMode(k); }} style={{ cursor: "pointer", borderRadius: 8, padding: "10px 12px", border: "2px solid " + (on ? col : BORDER), background: on ? col + "14" : "#fff", transition: "all 0.12s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 7, border: "2px solid " + (on ? col : BORDER), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {on && <div style={{ width: 6, height: 6, borderRadius: 3, background: col }} />}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Mode {k} — {EXPORT_MODES[k].title}</span>
                    <span style={{ marginLeft: "auto", padding: "1px 6px", borderRadius: 10, fontSize: 9, fontWeight: 700, background: col + "22", color: k === "A" ? "#8b6914" : "#92400e" }}>{EXPORT_MODES[k].badge}</span>
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 4, marginLeft: 22 }}>{EXPORT_MODES[k].sub}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, marginTop: 6, marginLeft: 22, color: DARK }}>
                    {k === "A"
                      ? <>CompteNum <b>70611DUPONT</b> · CompAuxNum <span style={{ color: FAINT }}>(vide)</span></>
                      : <>CompteNum <b>70611</b> · CompAuxNum <b>DUPONT</b></>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PARAMÈTRES */}
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e8e4db", padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={label}>Dossier</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>Stairling Union</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={label}>Période</span>
              <span style={{ fontSize: 10, color: FAINT }}>Du</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInput} />
              <span style={{ fontSize: 10, color: FAINT }}>au</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInput} />
              <button onClick={() => { setFrom(FY_FROM); setTo(FY_TO); }} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1.5px solid " + GOLD, background: from === FY_FROM && to === FY_TO ? GOLD : "#fff", color: from === FY_FROM && to === FY_TO ? "#fff" : "#8b6914" }}>Exercice</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={label}>Journaux</span>
              <JournalDropdown selected={journals} onChange={setJournals} />
              {!allJournals && <button onClick={() => setJournals(new Set())} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e" }}>Tous</button>}
            </div>
            <div style={{ fontSize: 9, color: FAINT, fontStyle: "italic", marginTop: 8 }}>
              Les filtres d'affichage (recherche, lettrage, tri) ne s'appliquent pas à l'export. Seules les écritures validées sont exportées{exp.drafts ? " — " + exp.drafts + " DRAFT exclue(s)" : ""}.
            </div>
          </div>

          {/* BANDEAUX */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {complete && mode === "A" && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "4px solid " + GREEN, color: "#166534", fontSize: 11, fontWeight: 700 }}>✓ FEC complet — exercice entier, tous les journaux. Fichier destiné à l'administration fiscale.</div>
            )}
            {!complete && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fcd34d", borderLeft: "4px solid " + AMBER, color: "#92400e", fontSize: 11, fontWeight: 700 }}>⚠ Extrait — ne constitue pas un FEC annuel complet.</div>
            )}
            {mode === "B" && (
              <div style={{ padding: "8px 12px", borderRadius: 6, background: "#fffbeb", border: "1px solid #fcd34d", borderLeft: "4px solid " + AMBER, color: "#92400e", fontSize: 11, fontWeight: 700 }}>⚠ Vue d'analyse — comptes remappés (règles {MAP_VERSION}). Ne pas transmettre comme FEC fiscal.</div>
            )}
          </div>

          {/* APERÇU */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 10 }}>
            {[
              { l: "Écritures", v: new Set(exp.rows.map((e) => e.num)).size, c: DARK },
              { l: "Lignes", v: exp.rows.length, c: DARK },
              { l: "Total débit", v: formatNum(exp.d) + " €", c: GREEN },
              { l: "Total crédit", v: formatNum(exp.c) + " €", c: RED },
              { l: "Anomalies", v: exp.anomalies.filter((a) => a.sev !== "info").length, c: blocking ? RED : warnings ? AMBER : GREEN },
            ].map((k, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 7, border: "1px solid #e8e4db", padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: FAINT, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{k.l}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: k.c, marginTop: 2 }}>{k.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 10, color: MUTED, marginBottom: 8 }}>
            <span>Journaux : {exp.usedJournals.map((j) => <span key={j} style={{ padding: "1px 5px", marginRight: 3, borderRadius: 3, fontSize: 9, fontWeight: 700, background: GOLD + "18", color: "#92700a", fontFamily: "monospace" }}>{j}</span>)}</span>
            <span>Fichier : <b style={{ fontFamily: "monospace", color: DARK }}>{fileName}</b></span>
          </div>

          {mode === "B" && Object.keys(exp.byRoot).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8, fontSize: 10 }}>
              <span style={{ color: MUTED }}>Totaux par compte général :</span>
              {Object.keys(exp.byRoot).sort().map((r) => (
                <span key={r} style={{ fontFamily: "monospace", padding: "2px 7px", borderRadius: 4, border: "1px solid #fcd34d", background: "#fffbeb", color: "#92400e", fontWeight: 700 }}>{r} = {formatNum(exp.byRoot[r])}</span>
              ))}
              <span style={{ color: FAINT, fontStyle: "italic" }}>(rapport uniquement)</span>
            </div>
          )}

          {/* APERÇU DES LIGNES */}
          <div style={{ borderRadius: 8, border: "1px solid #e8e4db", overflow: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, background: "#fff" }}>
              <thead>
                <tr style={{ background: "#f0ede6", borderBottom: "2px solid " + GOLD }}>
                  {["EcritureNum", "JournalCode", "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib", "Debit", "Credit"].map((h, i) => (
                    <th key={h} style={{ padding: "6px", textAlign: i >= 6 ? "right" : "left", color: MUTED, fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", background: i >= 2 && i <= 5 ? (mode === "B" ? "#fef3c7" : "#f0ede6") : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.length === 0 && <tr><td colSpan={8} style={{ padding: 18, textAlign: "center", color: FAINT }}>Aucune ligne à exporter</td></tr>}
                {preview.map(({ e, m }, i) => {
                  const hl = m.kind === "mapped" ? { background: "#fffbeb" } : m.kind === "error" ? { background: "#fef2f2" } : {};
                  return (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f0ece3", background: i % 2 ? "#faf9f6" : "#fff" }}>
                      <td style={{ padding: "4px 6px", fontFamily: "monospace" }}>{e.num}</td>
                      <td style={{ padding: "4px 6px", fontFamily: "monospace", fontSize: 9 }}>{e.journal}</td>
                      <td style={{ padding: "4px 6px", fontFamily: "monospace", fontWeight: 700, color: getAccountColor(m.num), ...hl }}>
                        {m.num}{m.kind === "mapped" && <span style={{ display: "block", fontWeight: 400, fontSize: 8, color: FAINT }}>← {e.account}</span>}
                      </td>
                      <td style={{ padding: "4px 6px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...hl }}>{m.lib}</td>
                      <td style={{ padding: "4px 6px", fontFamily: "monospace", fontWeight: 700, ...hl }}>{m.auxNum || <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={{ padding: "4px 6px", ...hl }}>{m.auxLib || <span style={{ color: "#d6d3d1" }}>—</span>}</td>
                      <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", color: e.debit ? GREEN : "#d6d3d1" }}>{fecAmount(e.debit)}</td>
                      <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "monospace", color: e.credit ? RED : "#d6d3d1" }}>{fecAmount(e.credit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {exp.lines.length > 6 && (
              <div onClick={() => setShowAll((v) => !v)} style={{ padding: "5px 8px", fontSize: 10, color: "#8b6914", fontWeight: 600, cursor: "pointer", background: "#faf9f6", borderTop: "1px solid #e8e4db" }}>
                {showAll ? "▲ Réduire (ordre du fichier)" : "▼ Voir les " + exp.lines.length + " lignes dans l'ordre du fichier"} · aperçu limité aux colonnes 3, 1, 5 à 8, 12 et 13 sur 18
              </div>
            )}
          </div>

          {/* CONTRÔLES */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {exp.checks.map(([code, l, ok]) => {
              const sev = exp.anomalies.find((a) => a.code === code && a.sev !== "info")?.sev;
              const col = ok ? GREEN : sev === "block" ? RED : AMBER;
              return <span key={code} title={l} style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, fontFamily: "monospace", border: "1px solid " + col + "55", background: col + "12", color: col }}>{ok ? "✓" : sev === "block" ? "✗" : "!"} {code} {l}</span>;
            })}
          </div>

          {exp.anomalies.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {exp.anomalies.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", borderRadius: 6, background: SEV[a.sev].bg, border: "1px solid " + SEV[a.sev].bd, fontSize: 10, color: DARK }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: SEV[a.sev].c, whiteSpace: "nowrap" }}>{a.code} · {SEV[a.sev].l}</span>
                  <span>{a.msg}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, marginBottom: 10 }}>✓ Aucune anomalie</div>
          )}

          {warnings && !blocking && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: DARK, cursor: "pointer", marginBottom: 6 }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ accentColor: GOLD }} />
              J'ai pris connaissance des avertissements ; ils figureront dans le rapport d'export.
            </label>
          )}

          {history.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed " + BORDER }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 }}>Historique des exports (session)</div>
              {history.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 10, color: MUTED, fontFamily: "monospace", padding: "2px 0" }}>
                  <span>{h.at}</span><span style={{ color: DARK, fontWeight: 700 }}>{h.fileName}</span><span>mode {h.mode}</span><span>SHA-256 {h.sha ? h.sha.slice(0, 8) + "…" : "n/d"}</span>
                  <span onClick={() => download(h.fileName.replace(".txt", "_RAPPORT.txt"), h.report, "text/plain;charset=utf-8")} style={{ color: "#8b6914", cursor: "pointer", textDecoration: "underline" }}>rapport</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, padding: "10px 18px", borderTop: "1px solid #e8e4db", background: "#f5f3ee" }}>
          {blocking && <span style={{ fontSize: 10, color: RED, fontWeight: 600, marginRight: "auto" }}>Corriger les anomalies bloquantes pour exporter.</span>}
          <button onClick={onClose} style={{ padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e" }}>Annuler</button>
          <button onClick={downloadReport} style={{ padding: "6px 14px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + BORDER, background: "#fff", color: "#57534e" }}>Télécharger le rapport</button>
          <button onClick={doExport} disabled={!canExport} title={blocking ? "Corriger les anomalies bloquantes" : warnings && !ack ? "Cochez la prise de connaissance des avertissements" : ""} style={{ padding: "6px 16px", borderRadius: 5, fontSize: 11, fontWeight: 800, cursor: canExport ? "pointer" : "not-allowed", fontFamily: "inherit", border: "1px solid " + (canExport ? (mode === "A" ? GOLD : AMBER) : BORDER), background: canExport ? (mode === "A" ? GOLD : AMBER) : "#e7e5e4", color: canExport ? (mode === "A" ? DARK : "#fff") : FAINT }}>
            {mode === "A" ? "📄 Exporter le FEC" : "📊 Exporter la vue d'analyse"}
          </button>
        </div>
      </div>
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
  const [exportOpen, setExportOpen] = useState(false);
  const [exportHistory, setExportHistory] = useState([]);

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

  // L'export FEC passe par la fenêtre ExportFECModal (modes A / B)
  const onExported = useCallback((h) => {
    setExportHistory((list) => [h, ...list]);
    setExportOpen(false);
    setNotif("Export terminé — " + h.fileName + (h.sha ? " — SHA-256 " + h.sha.slice(0, 8) + "…" : ""));
    setTimeout(() => setNotif(null), 5000);
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
            <button onClick={() => setExportOpen(true)} onMouseEnter={(e) => { e.currentTarget.style.background = "#fdf8ec"; }} onMouseLeave={(e) => { e.currentTarget.style.background = GOLD + "12"; }} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid " + GOLD, background: GOLD + "12", color: "#8b6914", display: "flex", alignItems: "center", gap: 4, transition: "all 0.12s" }}>📄 Export FEC</button>
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

      {exportOpen && (
        <ExportFECModal initFrom={dateFrom} initTo={dateTo} initJournals={selJournals} history={exportHistory} onExported={onExported} onClose={() => setExportOpen(false)} />
      )}

      {notif && (
        <div style={{ position: "fixed", bottom: 18, right: 18, background: DARK, color: GREEN, padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid " + GREEN }}>✓ {notif}</div>
      )}
    </div>
  );
}
