import type { RiskProfile } from "@/services/optimizerService";
import type { RiskScoreBreakdown, UserProfile } from "./types";

export function scoreRisk(p: UserProfile, investment: number): { profile: RiskProfile; breakdown: RiskScoreBreakdown } {
  const reasons: string[] = [];
  const { age, monthlyIncome, monthlyExpenses, sideIncome, familyMembers, existingInvestments, investmentHorizon } = p;

  let ageScore: number;
  if (age < 25) ageScore = 4;
  else if (age < 35) ageScore = 3;
  else if (age < 45) ageScore = 2;
  else if (age < 55) ageScore = 1;
  else if (age < 60) ageScore = -1;
  else ageScore = -2;
  reasons.push(
    ageScore >= 3 ? `Age ${age}: a long runway for growth` : ageScore >= 1 ? `Age ${age}: still decades of compounding ahead` : `Age ${age}: protecting capital starts to matter more`,
  );

  const totalIncome = monthlyIncome + sideIncome;
  const savingsRate = totalIncome > 0 ? (totalIncome - monthlyExpenses) / totalIncome : 0;
  const surplus = totalIncome - monthlyExpenses;
  let savingsScore: number;
  if (savingsRate > 0.4 && surplus >= 15000) savingsScore = 2;
  else if (savingsRate > 0.25 && surplus >= 10000) savingsScore = 1;
  else if (savingsRate > 0.15) savingsScore = 0;
  else savingsScore = -1;
  reasons.push(savingsRate < 0 ? "Spending more than you earn each month" : `Saving ${(savingsRate * 100).toFixed(0)}% of income`);

  let familyScore: number;
  if (familyMembers === 1) familyScore = 2;
  else if (familyMembers === 2) familyScore = 1;
  else if (familyMembers <= 4) familyScore = 0;
  else familyScore = -1;
  reasons.push(familyMembers === 1 ? "No dependants" : `Household of ${familyMembers}`);

  const horizonScore = { very_long: 3, long: 2, medium: 1 }[investmentHorizon as "very_long" | "long" | "medium"] ?? 0;
  reasons.push({ very_long: "Horizon over 15 years", long: "Horizon of 7 to 15 years", medium: "Horizon of 3 to 7 years" }[investmentHorizon as "very_long"] ?? "Horizon under 3 years");

  let investmentScore: number;
  if (existingInvestments > totalIncome * 12) investmentScore = 2;
  else if (existingInvestments > totalIncome * 6) investmentScore = 1;
  else investmentScore = 0;
  reasons.push(investmentScore ? "An existing investment cushion" : "Still building an investment base");

  const ratio = investment > 0 && totalIncome > 0 ? investment / (totalIncome * 12) : 0;
  const ratioScore = ratio < 0.1 ? 1 : ratio > 0.5 ? -1 : 0;
  reasons.push(ratioScore > 0 ? "This amount is small next to your yearly income" : ratioScore < 0 ? "This amount is large next to your yearly income" : "This amount is in proportion to your income");

  const totalScore = ageScore + savingsScore + familyScore + horizonScore + investmentScore + ratioScore;
  const profile: RiskProfile = totalScore >= 9 ? "aggressive" : totalScore >= 2 ? "balanced" : "conservative";
  return { profile, breakdown: { ageScore, savingsScore, familyScore, horizonScore, investmentScore, ratioScore, totalScore, reasons } };
}
