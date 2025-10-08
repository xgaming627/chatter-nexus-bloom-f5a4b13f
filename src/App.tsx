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
import NexusPlus from "./pages/NexusPlus";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import QuotaWarningBanner from "./components/QuotaWarningBanner";
import WarnUserNotification from "./components/WarnUserNotification";
import WarningNotificationModal from "./components/WarningNotificationModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduce retries to avoid extra Firebase calls
      staleTime: 300000, // 5 minutes
      gcTime: 900000, // 15 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* ✅ LiveSupportProvider moved OUTSIDE of AuthProvider */}
    <LiveSupportProvider>
      <AuthProvider>
        <TooltipProvider>
          {/* ✅ AppInitializer can safely stay inside Auth context */}
          <AppInitializer />

          {/* ✅ Global UI Components */}
          <QuotaWarningBanner />
          <WarnUserNotification />
          <WarningNotificationModal />
          <Toaster />
          <Sonner />

          {/* ✅ Routing */}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/support/:sessionId" element={<SupportChat />} />
              <Route path="/nexus-plus" element={<NexusPlus />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LiveSupportProvider>
  </QueryClientProvider>
);

export default App;
