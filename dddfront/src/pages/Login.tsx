// dddfront/src/pages/Login.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, isAuthenticated, user, isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [apiError, setApiError] = useState<string | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const navigate = useNavigate();

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  // ✅ useEffect pour rediriger APRÈS que isAuthenticated soit mis à jour
  useEffect(() => {
    if (shouldRedirect && isAuthenticated && user) {
      console.log('🎯 Redirection après authentification:', {
        isAuthenticated,
        user: user.name,
        role: user.role?.name,
        isAdmin
      });

      if (isAdmin) {
        console.log('➡️ Redirection vers /admin');
        setTimeout(() => navigate("/admin", { replace: true }), 100);
      } else {
        console.log('➡️ Redirection vers /appels-offres');
        setTimeout(() => navigate("/appels-offres", { replace: true }), 100);
      }
      
      setShouldRedirect(false); // Reset le flag
    }
  }, [shouldRedirect, isAuthenticated, user, isAdmin, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
    setApiError(null);
  };

  const validateLoginForm = () => {
    let newErrors: typeof errors = { email: "", password: "" };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = "L'adresse email est obligatoire.";
      isValid = false;
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(formData.email)) {
      newErrors.email = "Veuillez entrer une adresse email valide.";
      isValid = false;
    }
    if (!formData.password) {
      newErrors.password = "Le mot de passe est obligatoire.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginForm()) {
      return;
    }
    setApiError(null);

    try {
      const loggedInUser = await login(formData.email, formData.password);

      const roleRaw = typeof loggedInUser.role === "string" ? loggedInUser.role : loggedInUser.role?.name;
      const roleName = roleRaw?.toString().trim().toUpperCase();
      const isAdmin = roleName === "ADMIN" || (loggedInUser as any)?.role_id === 1;

      toast({
        title: "Connexion réussie !",
        description: `Bienvenue, ${loggedInUser.name}.`,
      });

      // Utilisation de window.location.href pour garantir le rechargement et la redirection
      if (isAdmin) {
        window.location.href = "/admin"; 
      } else if (roleName === "FOURNISSEUR") {
        window.location.href = "/fournisseur/dashboard";
      } else if (roleName === "RESPONSABLE_MARCHE") {
        window.location.href = "/responsable/dashboard";
      } else {
        window.location.href = "/appels-offres";
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Identifiants incorrects. Veuillez réessayer.";
      setApiError(errorMessage);
      toast({
        title: "Erreur de connexion",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <Header />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <LogIn className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Connexion</CardTitle>
              <CardDescription className="text-base">
                Accédez à votre espace personnel
              </CardDescription>
            </CardHeader>

            <CardContent>
              {apiError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-4 text-center">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@exemple.sn"
                      className="pl-10"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-destructive text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Link
                      to="/mot-de-passe-oublie"
                      className="text-sm text-primary hover:underline"
                      tabIndex={-1}
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                {/* Bouton de connexion */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>

              {/* Lien d'inscription */}
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Vous êtes un fournisseur ?{" "}
                  <Link
                    to="/inscription"
                    className="text-primary font-medium hover:underline"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informations supplémentaires */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              En vous connectant, vous acceptez nos{" "}
              <Link to="/conditions" className="text-primary hover:underline">
                conditions d'utilisation
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}