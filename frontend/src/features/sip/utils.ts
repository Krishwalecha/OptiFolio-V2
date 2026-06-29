import { SAVED_KEY } from "./config";
import type { SavedCalc } from "./types";

export const formatINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");

export function readSaved(): SavedCalc[] {
  try {
    const r = localStorage.getItem(SAVED_KEY);
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

export function writeSaved(calcs: SavedCalc[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(calcs));
  } catch {}
}

export function calcStepUp(m: number, r: number, y: number, su: number) {
  const mr = r / 12 / 100;
  let maturity = 0, invested = 0, cur = m;
  for (let yr = 0; yr < y; yr++) {
    for (let mo = 0; mo < 12; mo++) {
      maturity += cur * Math.pow(1 + mr, (y - yr) * 12 - mo);
      invested += cur;
    }
    cur *= 1 + su / 100;
  }
  return { maturity: Math.round(maturity), invested: Math.round(invested) };
}

export function downloadPDF(data: {
  monthly: string;
  rate: string;
  years: string;
  result: any;
  mode: string;
  stepUp: string;
  inflation: string;
}) {
  const { monthly, rate, years, result, mode, stepUp, inflation } = data;
  if (!result) return;

  const gains = result.returns || 0;
  const y = parseFloat(years) || 1;
  const isLongTerm = y >= 1;
  const ltcgExemption = 100000;
  const taxableGains = isLongTerm ? Math.max(0, gains - ltcgExemption) : gains;
  const taxRate = isLongTerm ? 0.1 : 0.15;
  const taxAmount = Math.round(taxableGains * taxRate);
  const postTaxMaturity = result.maturity - taxAmount;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SIP Projection Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 40px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #000; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f5f5f5; }
    .row:last-child { border-bottom: none; }
    .label { font-size: 13px; color: #555; }
    .value { font-size: 13px; font-weight: 600; color: #111; font-family: monospace; }
    .highlight { background: #f9f9f9; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; }
    .big { font-size: 22px; font-weight: 700; color: #111; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .amber { color: #d97706; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: #f9f9f9; border-radius: 8px; padding: 14px; }
    .card-label { font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .card-value { font-size: 18px; font-weight: 700; font-family: monospace; }
    .disclaimer { font-size: 11px; color: #aaa; line-height: 1.7; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; }
    .badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 99px; font-weight: 500; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>SIP Projection Report</h1>
  <p class="subtitle">Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · OptiFolio</p>

  <div class="section">
    <div class="section-title">Investment Parameters</div>
    <div class="row"><span class="label">Mode</span><span class="value">${mode.charAt(0).toUpperCase() + mode.slice(1)} SIP</span></div>
    <div class="row"><span class="label">Monthly SIP</span><span class="value">${formatINR(parseFloat(monthly))}</span></div>
    <div class="row"><span class="label">Expected Return</span><span class="value">${rate}% per annum</span></div>
    <div class="row"><span class="label">Investment Period</span><span class="value">${years} years</span></div>
    ${parseFloat(stepUp) > 0 ? `<div class="row"><span class="label">Annual Step-Up</span><span class="value">${stepUp}% per year</span></div>` : ""}
    ${parseFloat(inflation) > 0 ? `<div class="row"><span class="label">Inflation Rate</span><span class="value">${inflation}% per year</span></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Projection Summary</div>
    <div class="highlight">
      <div class="card-label">Estimated Maturity Value</div>
      <div class="big">${formatINR(result.maturity)}</div>
    </div>
    <div class="grid">
      <div class="card"><div class="card-label">Total Invested</div><div class="card-value">${formatINR(result.invested)}</div></div>
      <div class="card"><div class="card-label">Estimated Returns</div><div class="card-value green">${formatINR(result.returns)}</div></div>
      ${result.realMaturity ? `<div class="card"><div class="card-label">Real Value (Inflation-adj.)</div><div class="card-value amber">${formatINR(result.realMaturity)}</div></div>` : ""}
      <div class="card"><div class="card-label">Wealth Multiplier</div><div class="card-value">${(result.maturity / result.invested).toFixed(2)}×</div></div>
    </div>
  </div>

  <div class="section">
    <div class="row"><span class="label">Capital Gains Type</span><span class="value"><span class="badge" style="background:${isLongTerm ? "#dcfce7" : "#fee2e2"}; color:${isLongTerm ? "#16a34a" : "#dc2626"}">${isLongTerm ? "LTCG (10%)" : "STCG (15%)"}</span></span></div>
    <div class="row"><span class="label">Total Gains</span><span class="value green">${formatINR(gains)}</span></div>
    ${isLongTerm ? `<div class="row"><span class="label">LTCG Exemption</span><span class="value amber">- ${formatINR(Math.min(gains, ltcgExemption))}</span></div>` : ""}
    <div class="row"><span class="label">Estimated Tax</span><span class="value red">${formatINR(taxAmount)}</span></div>
    <div class="row"><span class="label">Post-Tax Maturity</span><span class="value">${formatINR(postTaxMaturity)}</span></div>
  </div>

  <p class="disclaimer">
    This report is for informational purposes only and does not constitute financial or investment advice.
    Projections are based on assumed constant returns and may not reflect actual market performance.
    Tax calculations are estimates based on current LTCG/STCG rules for equity mutual funds and may vary.
    Please consult a certified financial advisor before making investment decisions.
  </p>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SIP_Report_${new Date().toISOString().split("T")[0]}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
