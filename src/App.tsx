import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Products from "./pages/admin/Products.tsx";
import NewProduct from "./pages/admin/NewProduct.tsx";
import EditProduct from "./pages/admin/EditProduct.tsx";
import Stats from "./pages/admin/Stats.tsx";
import CompanySettings from "./pages/admin/CompanySettings.tsx";
import Coupons from "./pages/admin/Coupons.tsx";
import SitesAdmin from "./pages/admin/Sites.tsx";
import ProductGroups from "./pages/admin/ProductGroups.tsx";
import PublicProduct from "./pages/PublicProduct.tsx";
import PublicGroup from "./pages/PublicGroup.tsx";
import GoRedirect from "./pages/GoRedirect.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import NotFound from "./pages/NotFound.tsx";
import ProfilePage from "./pages/Profile.tsx";
import ProfileLinks from "./pages/admin/ProfileLinks.tsx";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

const queryClient = new QueryClient();

const App = () => {
  useDynamicFavicon();
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/cupons" element={<Portfolio />} />
            <Route path="/sites" element={<Portfolio />} />
            <Route path="/login" element={<Login />} />
            <Route path="/p/:slug" element={<PublicProduct />} />
            <Route path="/g/:slug" element={<PublicGroup />} />
            <Route path="/go/:slug" element={<GoRedirect />} />
            <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/produtos" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/admin/produtos/novo" element={<ProtectedRoute><NewProduct /></ProtectedRoute>} />
            <Route path="/admin/produtos/:id/editar" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
            <Route path="/admin/empresa" element={<ProtectedRoute><CompanySettings /></ProtectedRoute>} />
            <Route path="/admin/cupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
            <Route path="/admin/sites" element={<ProtectedRoute><SitesAdmin /></ProtectedRoute>} />
            <Route path="/admin/grupos" element={<ProtectedRoute><ProductGroups /></ProtectedRoute>} />
            <Route path="/admin/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin/profile-links" element={<ProtectedRoute><ProfileLinks /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
