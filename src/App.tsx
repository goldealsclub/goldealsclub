import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { FavoritesProvider } from "@/lib/favorites";
import { GenderProvider } from "@/lib/gender-context";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import DealPage from "./pages/DealPage";
import FavoritesPage from "./pages/FavoritesPage";
import TrendsPage from "./pages/TrendsPage";
import SellersPage from "./pages/SellersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <FavoritesProvider>
        <GenderProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/deal/:id" element={<DealPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/trends" element={<TrendsPage />} />
              <Route path="/sellers" element={<SellersPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </GenderProvider>
      </FavoritesProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
