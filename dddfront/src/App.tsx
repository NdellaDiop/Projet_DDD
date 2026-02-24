import { Routes, Route, Navigate } from "react-router-dom"; 
import { useAuth } from "./context/AuthContext";
import Index from "./pages/Index";
import AppelsOffres from "./pages/AppelsOffres";
import AppelOffreDetails from "./pages/AppelOffreDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CommentCaMarche from "./pages/CommentCaMarche";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound"; 
import { Toaster } from "@/components/ui/toaster";
import FournisseurDashboard from "./pages/FournisseurDashboard";
import ResponsableDashboard from "./pages/ResponsableDashboard";

// Composant de chargement réutilisable
const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-sm text-muted-foreground font-medium">Chargement...</p>
    </div>
  </div>
);

function App() {
  const { isAuthenticated, user, loading, isAdmin } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/appels-offres" element={<AppelsOffres />} />
        <Route path="/appels-offres/:id" element={<AppelOffreDetails />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/inscription" element={<Register />} />
        <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
        
        {/* Route protégée pour l'administrateur */}
        <Route
          path="/admin"
          element={
            isAuthenticated && isAdmin ? (
              <AdminDashboard />
            ) : loading ? (
              <LoadingScreen />
            ) : (
              <Navigate to="/connexion" replace />
            )
          }
        />

        <Route
          path="/fournisseur/dashboard"
          element={
            isAuthenticated && user?.role?.name === 'FOURNISSEUR' ? (
              <FournisseurDashboard />
            ) : loading ? (
              <LoadingScreen />
            ) : (
              <Navigate to="/connexion" replace />
            )
          }
        />

      <Route
          path="/responsable/dashboard"
          element={
            isAuthenticated && (user?.role?.name === 'RESPONSABLE_MARCHE' || isAdmin) ? (
              <ResponsableDashboard />
            ) : loading ? (
              <LoadingScreen />
            ) : (
              <Navigate to="/connexion" replace />
            )
          }
        />
        
        {/* Route de capture pour les chemins non définis */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;