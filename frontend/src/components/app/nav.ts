import { LayoutGrid, Wand2, Briefcase, Newspaper, Calculator, Users, BookOpen, LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { label: "Overview", path: "/Dashboard", icon: LayoutGrid },
      { label: "Optimize", path: "/Optimizer", icon: Wand2 },
      { label: "Portfolios", path: "/Portfolios", icon: Briefcase },
      { label: "Markets", path: "/FinancialNews", icon: Newspaper },
      { label: "SIP planner", path: "/SIPCalculator", icon: Calculator },
    ],
  },
  {
    group: "Grow",
    items: [
      { label: "Community", path: "/Community", icon: Users },
      { label: "Learn", path: "/Learn", icon: BookOpen },
    ],
  },
];
