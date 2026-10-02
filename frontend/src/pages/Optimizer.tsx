import React from "react";
import AppShell from "@/components/app/AppShell";
import Builder from "@/components/optimizer/Builder";

const Optimizer: React.FC = () => (
  <AppShell title="Optimize" description="Pick your stocks and an amount. You get whole-share quantities, the return to expect, and the risk you are taking on.">
    <Builder />
  </AppShell>
);

export default Optimizer;
