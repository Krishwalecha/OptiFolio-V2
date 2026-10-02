export type Sector =
  | "Banks"
  | "Financial services"
  | "IT"
  | "Energy"
  | "FMCG"
  | "Auto"
  | "Pharma & health"
  | "Metals & mining"
  | "Capital goods & defence"
  | "Cement & materials"
  | "Telecom & media"
  | "Consumer & retail"
  | "Utilities"
  | "Real estate"
  | "Chemicals"
  | "Index fund";

const MAP: Record<string, Sector> = {
  HDFCBANK: "Banks", ICICIBANK: "Banks", SBIN: "Banks", KOTAKBANK: "Banks", AXISBANK: "Banks", INDUSINDBK: "Banks", BANKBARODA: "Banks", PNB: "Banks", CANBK: "Banks", IDFCFIRSTB: "Banks", FEDERALBNK: "Banks", AUBANK: "Banks", UNIONBANK: "Banks", YESBANK: "Banks", BANDHANBNK: "Banks",
  BAJFINANCE: "Financial services", BAJAJFINSV: "Financial services", HDFCLIFE: "Financial services", SBILIFE: "Financial services", ICICIPRULI: "Financial services", ICICIGI: "Financial services", SHRIRAMFIN: "Financial services", CHOLAFIN: "Financial services", MUTHOOTFIN: "Financial services", LICI: "Financial services", JIOFIN: "Financial services", PFC: "Financial services", RECLTD: "Financial services", IRFC: "Financial services", HDFCAMC: "Financial services", BSE: "Financial services", CDSL: "Financial services", PAYTM: "Financial services", POLICYBZR: "Financial services", LICHSGFIN: "Financial services", MFSL: "Financial services",
  TCS: "IT", INFY: "IT", HCLTECH: "IT", WIPRO: "IT", TECHM: "IT", LTIM: "IT", PERSISTENT: "IT", COFORGE: "IT", MPHASIS: "IT", OFSS: "IT", KPITTECH: "IT", TATAELXSI: "IT", LTTS: "IT",
  RELIANCE: "Energy", ONGC: "Energy", BPCL: "Energy", IOC: "Energy", HINDPETRO: "Energy", GAIL: "Energy", COALINDIA: "Energy", OIL: "Energy", PETRONET: "Energy", ADANIGREEN: "Energy", ADANIENSOL: "Energy", IGL: "Energy",
  HINDUNILVR: "FMCG", ITC: "FMCG", NESTLEIND: "FMCG", BRITANNIA: "FMCG", DABUR: "FMCG", MARICO: "FMCG", GODREJCP: "FMCG", COLPAL: "FMCG", TATACONSUM: "FMCG", VBL: "FMCG", UNITDSPR: "FMCG", PGHH: "FMCG",
  MARUTI: "Auto", "M&M": "Auto", TATAMOTORS: "Auto", BAJAJ_AUTO: "Auto", "BAJAJ-AUTO": "Auto", EICHERMOT: "Auto", HEROMOTOCO: "Auto", TVSMOTOR: "Auto", ASHOKLEY: "Auto", BOSCHLTD: "Auto", MOTHERSON: "Auto", TIINDIA: "Auto", MRF: "Auto", BALKRISIND: "Auto", EXIDEIND: "Auto", TMPV: "Auto", TMCV: "Auto",
  SUNPHARMA: "Pharma & health", DRREDDY: "Pharma & health", CIPLA: "Pharma & health", DIVISLAB: "Pharma & health", APOLLOHOSP: "Pharma & health", LUPIN: "Pharma & health", TORNTPHARM: "Pharma & health", ZYDUSLIFE: "Pharma & health", AUROPHARMA: "Pharma & health", MAXHEALTH: "Pharma & health", ALKEM: "Pharma & health", MANKIND: "Pharma & health", FORTIS: "Pharma & health", BIOCON: "Pharma & health", GLENMARK: "Pharma & health",
  TATASTEEL: "Metals & mining", JSWSTEEL: "Metals & mining", HINDALCO: "Metals & mining", VEDL: "Metals & mining", NMDC: "Metals & mining", SAIL: "Metals & mining", JINDALSTEL: "Metals & mining", NATIONALUM: "Metals & mining", HINDZINC: "Metals & mining",
  LT: "Capital goods & defence", HAL: "Capital goods & defence", BEL: "Capital goods & defence", MAZDOCK: "Capital goods & defence", COCHINSHIP: "Capital goods & defence", GRSE: "Capital goods & defence", BDL: "Capital goods & defence", SIEMENS: "Capital goods & defence", ABB: "Capital goods & defence", BHEL: "Capital goods & defence", CUMMINSIND: "Capital goods & defence", CGPOWER: "Capital goods & defence", POLYCAB: "Capital goods & defence", HAVELLS: "Capital goods & defence", SUZLON: "Capital goods & defence", ADANIENT: "Capital goods & defence", ADANIPORTS: "Capital goods & defence", RVNL: "Capital goods & defence", IRCTC: "Capital goods & defence", DIXON: "Capital goods & defence", SOLARINDS: "Capital goods & defence", KEI: "Capital goods & defence",
  ULTRACEMCO: "Cement & materials", GRASIM: "Cement & materials", SHREECEM: "Cement & materials", AMBUJACEM: "Cement & materials", ACC: "Cement & materials", ASIANPAINT: "Cement & materials", BERGEPAINT: "Cement & materials", PIDILITIND: "Cement & materials", DALBHARAT: "Cement & materials",
  BHARTIARTL: "Telecom & media", IDEA: "Telecom & media", INDUSTOWER: "Telecom & media", TATACOMM: "Telecom & media", ZEEL: "Telecom & media", SUNTV: "Telecom & media", NAUKRI: "Telecom & media",
  TITAN: "Consumer & retail", TRENT: "Consumer & retail", DMART: "Consumer & retail", ZOMATO: "Consumer & retail", ETERNAL: "Consumer & retail", NYKAA: "Consumer & retail", VOLTAS: "Consumer & retail", PAGEIND: "Consumer & retail", JUBLFOOD: "Consumer & retail", INDHOTEL: "Consumer & retail", SWIGGY: "Consumer & retail", KALYANKJIL: "Consumer & retail", INDIGO: "Consumer & retail",
  NTPC: "Utilities", POWERGRID: "Utilities", TATAPOWER: "Utilities", ADANIPOWER: "Utilities", NHPC: "Utilities", JSWENERGY: "Utilities", TORNTPOWER: "Utilities", CESC: "Utilities",
  DLF: "Real estate", GODREJPROP: "Real estate", OBEROIRLTY: "Real estate", LODHA: "Real estate", PRESTIGE: "Real estate", PHOENIXLTD: "Real estate",
  PIIND: "Chemicals", SRF: "Chemicals", UPL: "Chemicals", DEEPAKNTR: "Chemicals", AARTIIND: "Chemicals", NAVINFLUOR: "Chemicals", TATACHEM: "Chemicals",
  NIFTYBEES: "Index fund",
};

export const SUGGEST: Partial<Record<Sector, string[]>> = {
  Banks: ["HDFCBANK", "ICICIBANK", "SBIN"],
  "Financial services": ["BAJFINANCE", "HDFCLIFE", "SHRIRAMFIN"],
  IT: ["INFY", "TCS", "HCLTECH"],
  Energy: ["RELIANCE", "ONGC", "COALINDIA"],
  FMCG: ["ITC", "HINDUNILVR", "NESTLEIND"],
  Auto: ["MARUTI", "M&M", "EICHERMOT"],
  "Pharma & health": ["SUNPHARMA", "DRREDDY", "APOLLOHOSP"],
  "Metals & mining": ["TATASTEEL", "HINDALCO", "JSWSTEEL"],
  "Capital goods & defence": ["LT", "HAL", "BEL"],
  "Cement & materials": ["ULTRACEMCO", "ASIANPAINT", "GRASIM"],
  "Telecom & media": ["BHARTIARTL"],
  "Consumer & retail": ["TITAN", "TRENT"],
  Utilities: ["NTPC", "POWERGRID"],
};

export const sectorOf = (ticker: string): Sector | null => MAP[ticker.toUpperCase().replace(/\.(NS|BO)$/, "")] ?? null;

export interface SectorCheck {
  counts: [Sector, number][];
  unknown: string[];
  dominant: { sector: Sector; count: number } | null;
  suggestions: { sector: Sector; ticker: string }[];
}

export function checkSectors(tickers: string[], weights?: Record<string, number>): SectorCheck {
  const known = new Map<Sector, number>();
  const unknown: string[] = [];
  for (const t of tickers) {
    const s = sectorOf(t);
    if (!s) unknown.push(t);
    else known.set(s, (known.get(s) ?? 0) + (weights ? weights[t] ?? 0 : 1));
  }
  const counts = [...known.entries()].sort((a, b) => b[1] - a[1]);
  const total = weights ? counts.reduce((a, [, n]) => a + n, 0) : tickers.length - unknown.length;
  const top = counts[0];
  const dominant = top && total >= 2 && top[1] / total >= 0.5 && tickers.length >= 2 ? { sector: top[0], count: top[1] } : null;
  const have = new Set(counts.map(([s]) => s));
  const picked = new Set(tickers.map((t) => t.toUpperCase()));
  const suggestions: { sector: Sector; ticker: string }[] = [];
  for (const [sector, list] of Object.entries(SUGGEST) as [Sector, string[]][]) {
    if (have.has(sector)) continue;
    const t = list.find((x) => !picked.has(x));
    if (t) suggestions.push({ sector, ticker: t });
  }
  return { counts, unknown, dominant, suggestions: suggestions.slice(0, 4) };
}
