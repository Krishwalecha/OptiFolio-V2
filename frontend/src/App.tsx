import { lazy, Suspense, useEffect } from "react";
import Landing from "./pages/Landing";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/context/AuthContext";
import { MFProvider } from "@/context/MFContext";
import FloatingChatbot from "@/components/FloatingChatBot";
import { AppLayout } from "@/components/app/AppShell";
import { Toaster } from "@/ui/toast";
import { PageLoader } from "@/ui/loaders";

const AppPage = lazy(() => import("./pages/Optimizer.tsx"));
const Portfolios = lazy(() => import("./pages/Portfolios"));
const About = lazy(() => import("./pages/About"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const FinancialNews = lazy(() => import("./pages/FinancialNews"));
const SIPCalculator = lazy(() => import("./pages/SIPCalculator"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Community = lazy(() => import("./pages/Community"));
const Learn = lazy(() => import("./pages/Learn"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ResultsPreview = import.meta.env.DEV ? lazy(() => import("./dev/ResultsPreview")) : null;

const queryClient = new QueryClient();

const API_BASE = import.meta.env.VITE_API_URL;

function BackendWakeup() {
  useEffect(() => {
    fetch(`${API_BASE}/api/health`).catch(() => {});
  }, []);
  return null;
}

const Fallback = () => (
  <div className="min-h-screen bg-background">
    <PageLoader />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <MFProvider>
          <Toaster />
            <BrowserRouter>
              <BackendWakeup />
              <Suspense fallback={<Fallback />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route element={<AppLayout />}>
                    <Route path="/Dashboard" element={<Dashboard />} />
                    <Route path="/Optimizer" element={<AppPage />} />
                    <Route path="/Portfolios" element={<Portfolios />} />
                    <Route path="/FinancialNews" element={<FinancialNews />} />
                    <Route path="/SIPCalculator" element={<SIPCalculator />} />
                    <Route path="/Community" element={<Community />} />
                    <Route path="/Learn" element={<Learn />} />
                    <Route path="/Learn/:slug" element={<Lesson />} />
                    {ResultsPreview && <Route path="/dev/results" element={<ResultsPreview />} />}
                  </Route>
                  <Route path="/About" element={<About />} />
                  <Route path="/SignIn" element={<SignIn />} />
                  <Route path="/SignUp" element={<SignUp />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <FloatingChatbot />
            </BrowserRouter>
        </MFProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
