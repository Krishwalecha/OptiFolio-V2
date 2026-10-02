import React from "react";
import AppShell from "@/components/app/AppShell";
import Results from "@/components/optimizer/Results";
import type { OptimizeResult } from "@/services/optimizerService";
import fixture from "./optimize-fixture.json";

const ResultsPreview: React.FC = () => (
  <AppShell title="Results preview" description="Development only. A real API response rendered without signing in.">
    <Results result={fixture as unknown as OptimizeResult} onSave={() => {}} />
  </AppShell>
);

export default ResultsPreview;
