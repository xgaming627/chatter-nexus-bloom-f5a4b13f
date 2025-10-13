// App.tsx
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
import NexusShop from "./pages/NexusShop";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import QuotaWarningBanner from "./components/QuotaWarningBanner";
import WarnUserNotification from "./components/WarnUserNotification";
import WarningNotificationModal from "./components/WarningNotificationModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 300000,
      gcTime: 900000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* AuthProvider must wrap anything that uses useAuth */}
    <AuthProvider>
      {/* LiveSupportProvider can be inside AuthProvider so it can call useAuth */}
      <LiveSupportProvider>
        <TooltipProvider>
          <AppInitializer />
          <QuotaWarningBanner />
          <WarnUserNotification />
          <WarningNotificationModal />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/support/:sessionId" element={<SupportChat />} />
              <Route path="/nexus-plus" element={<NexusPlus />} />
              <Route path="/nexus-shop" element={<NexusShop />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LiveSupportProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
