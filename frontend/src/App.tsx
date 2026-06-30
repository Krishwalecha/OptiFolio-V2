import { useEffect } from "react";
import Landing from "./pages/Landing";
import AppPage from "./pages/Optimizer.tsx";
import Portfolios from "./pages/Portfolios";
import About from "./pages/About";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import FinancialNews from "./pages/FinancialNews";
import SIPCalculator from "./pages/SIPCalculator";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import { MFProvider } from "@/context/MFContext";
import FloatingChatbot from "@/components/FloatingChatBot";

const queryClient = new QueryClient();

const API_BASE = import.meta.env.VITE_API_URL;

function BackendWakeup() {
  useEffect(() => {
    fetch(`${API_BASE}/api/health`).catch(() => {});
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <MFProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <BackendWakeup />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/Optimizer" element={<AppPage />} />
                <Route path="/Portfolios" element={<Portfolios />} />
                <Route path="/FinancialNews" element={<FinancialNews />} />
                <Route path="/SIPCalculator" element={<SIPCalculator />} />
                <Route path="/About" element={<About />} />
                <Route path="/SignIn" element={<SignIn />} />
                <Route path="/SignUp" element={<SignUp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <FloatingChatbot />
            </BrowserRouter>
          </TooltipProvider>
        </MFProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
