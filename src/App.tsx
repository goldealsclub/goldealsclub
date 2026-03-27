import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { FavoritesProvider } from "@/lib/favorites";
import { GenderProvider } from "@/lib/gender-context";
import { AuthProvider } from "@/lib/auth-context";
import { CompareProvider } from "./components/CompareDrawer";
import { VotesProvider } from "@/hooks/use-deal-votes";
import OnboardingModal from "./components/OnboardingModal";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import DealPage from "./pages/DealPage";
import FavoritesPage from "./pages/FavoritesPage";
import TrendsPage from "./pages/TrendsPage";
import SellersPage from "./pages/SellersPage";
import BrandPage from "./pages/BrandPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ScrollToTop from "./components/ScrollToTop";
import NewDealNotifier from "./components/NewDealNotifier";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <I18nProvider>
        <FavoritesProvider>
          <GenderProvider>
          <CompareProvider>
          <VotesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OnboardingModal />
            <BrowserRouter>
              <ScrollToTop />
              <NewDealNotifier />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/deal/:id" element={<DealPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/trends" element={<TrendsPage />} />
                <Route path="/sellers" element={<SellersPage />} />
                <Route path="/brand/:brand" element={<BrandPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </CompareProvider>
          </GenderProvider>
        </FavoritesProvider>
      </I18nProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
