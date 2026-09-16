import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { FavoritesProvider } from "@/lib/favorites";
import { GenderProvider } from "@/lib/gender-context";
import { AuthProvider } from "@/lib/auth-context";
import { CompareProvider } from "./components/CompareDrawer";
import { VotesProvider } from "@/hooks/use-deal-votes";
import { ConsentProvider } from "@/lib/cookie-consent";
import CookieBanner from "./components/CookieBanner";
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

import AdminVideosPage from "./pages/AdminVideosPage";
import AdminVideoHistoryPage from "./pages/AdminVideoHistoryPage";
import AdminVideoQAPage from "./pages/AdminVideoQAPage";
import AdminCardsQAPage from "./pages/AdminCardsQAPage";
import AdminBadgeQAPage from "./pages/AdminBadgeQAPage";
import AdminStylePreviewQAPage from "./pages/AdminStylePreviewQAPage";
import AdminStylesPage from "./pages/AdminStylesPage";



import InstallPage from "./pages/InstallPage";
import PromoCodesPage from "./pages/PromoCodesPage";
import OAuthConsent from "./pages/OAuthConsent";

import WorldCup2026Page from "./pages/WorldCup2026Page";
import InstallBanner from "./components/InstallBanner";
import UpdateBanner from "./components/UpdateBanner";
import HardRefreshButton from "./components/HardRefreshButton";

const queryClient = new QueryClient();

const GlobalOverlays = () => {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <>
      <NewDealNotifier />
      <HardRefreshButton />
      {!isAdminRoute ? (
        <>
          <OnboardingModal />
          <InstallBanner />
          <UpdateBanner />
          <CookieBanner />
        </>
      ) : null}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <I18nProvider>
        <FavoritesProvider>
          <GenderProvider>
          <CompareProvider>
          <VotesProvider>
          <ConsentProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
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
                <Route path="/admin/video" element={<Navigate to="/admin/videos" replace />} />
                <Route path="/admin/videos" element={<AdminVideosPage />} />
                <Route path="/admin/styles" element={<AdminStylesPage />} />

                <Route path="/admin/video/historique" element={<AdminVideoHistoryPage />} />
                <Route path="/admin/video-qa" element={<AdminVideoQAPage />} />
                <Route path="/admin/cards-qa" element={<AdminCardsQAPage />} />
                <Route path="/admin/badge-qa" element={<AdminBadgeQAPage />} />
                <Route path="/admin/style-preview-qa" element={<AdminStylePreviewQAPage />} />


                <Route path="/install" element={<InstallPage />} />
                <Route path="/codes-promo" element={<PromoCodesPage />} />
                <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />

                <Route path="/coupe-du-monde-2026" element={<WorldCup2026Page />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <GlobalOverlays />
            </BrowserRouter>
          </TooltipProvider>
          </ConsentProvider>
          </VotesProvider>
          </CompareProvider>
          </GenderProvider>
        </FavoritesProvider>
      </I18nProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
