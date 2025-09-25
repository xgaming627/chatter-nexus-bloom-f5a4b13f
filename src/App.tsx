
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LiveSupportProvider } from "./context/LiveSupportContext";
import AppInitializer from "./components/AppInitializer";
import Index from "./pages/Index";
import SupportChat from "./pages/SupportChat";
import NotFound from "./pages/NotFound";
import QuotaWarningBanner from "./components/QuotaWarningBanner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduce retries to avoid extra Firebase calls
      staleTime: 300000, // 5 minutes - keep data fresh longer
      gcTime: 900000, // 15 minutes - keep data in cache longer (formerly cacheTime)
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppInitializer />
      <LiveSupportProvider>
        <TooltipProvider>
          <QuotaWarningBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/support-chat/:sessionId" element={<SupportChat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LiveSupportProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
