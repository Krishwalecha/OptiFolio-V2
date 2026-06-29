export interface RiskScoreBreakdown {
  ageScore: number;
  savingsScore: number;
  familyScore: number;
  horizonScore: number;
  investmentScore: number;
  ratioScore: number;
  totalScore: number;
  reasons: string[];
}

export interface UserProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  sideIncome: number;
  age: number;
  familyMembers: number;
  existingInvestments: number;
  investmentHorizon: string;
}

export interface SavedRiskProfile {
  breakdown: RiskScoreBreakdown;
  profile: string;
  profileData: UserProfile;
  updatedAt: string;
}
