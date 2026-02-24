import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Lock,
  Building2,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, loading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();
  // État unifié pour les données du formulaire, uniquement les champs gérés par l'API /api/register
  const [formData, setFormData] = useState({
    name: "",
    nom_entreprise: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    password_confirmation: "",
    role_name: "FOURNISSEUR",
  });

  // État pour les erreurs de validation côté client
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setFormErrors((prev) => ({ ...prev, [id]: "" }));
    setApiError(null);
  };

  const validateForm = () => {
    let errors: Record<string, string> = {};
    let isValid = true;

    if (!formData.nom_entreprise) { errors.nom_entreprise = "La raison sociale est obligatoire."; isValid = false; }
    if (!formData.name) { errors.name = "Le nom du contact est obligatoire."; isValid = false; }
    if (!formData.email) {
      errors.email = "L'adresse email est obligatoire."; isValid = false;
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(formData.email)) {
      errors.email = "Veuillez entrer une adresse email valide."; isValid = false;
    }
    if (!formData.phone) { errors.phone = "Le téléphone est obligatoire."; isValid = false; } // Validation gardée même si non envoyé au backend par register
    if (!formData.address) { errors.address = "L'adresse est obligatoire."; isValid = false; } // Validation gardée même si non envoyé au backend par register

    if (!formData.password) {
      errors.password = "Le mot de passe est obligatoire."; isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères."; isValid = false;
    }
    if (!formData.password_confirmation) {
      errors.password_confirmation = "La confirmation du mot de passe est obligatoire."; isValid = false;
    } else if (formData.password !== formData.password_confirmation) {
      errors.password_confirmation = "Les mots de passe ne correspondent pas."; isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        role_name: formData.role_name,
        nom_entreprise: formData.nom_entreprise,
        adresse: formData.address,
        telephone: formData.phone,
      };

      const registeredUser = await register(payload);

      if (registeredUser?.is_active === false) {
        toast({
          title: "Compte créé",
          description: "Votre compte est en attente de validation par l'administrateur.",
        });
        navigate("/connexion");
        return;
      }
      
      toast({
        title: "Inscription réussie !",
        description: "Vous êtes maintenant connecté.",
      });
    } catch (error: any) {
      console.error("Erreur d'inscription:", error);
      const errorMessage = error.response?.data?.message || "Une erreur inattendue est survenue.";
      setApiError(errorMessage);
      toast({
        title: "Erreur d'inscription",
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
          className="w-full max-w-2xl"
        >
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Inscription Fournisseur</CardTitle>
              <CardDescription>
                Créez votre compte pour accéder aux appels d'offres
              </CardDescription>
            </CardHeader>

            <CardContent>
              {apiError && (
                <p className="text-destructive text-center text-sm mb-4">{apiError}</p>
              )}
              <motion.form
                key="single-step-form"
                initial={{ opacity: 0, x: 0 }} // Pas de transition latérale si une seule étape
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Informations générales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom_entreprise">Raison sociale *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="nom_entreprise"
                        placeholder="Nom de l'entreprise"
                        className="pl-10"
                        value={formData.nom_entreprise}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    {formErrors.nom_entreprise && (
                      <p className="text-destructive text-sm mt-1">{formErrors.nom_entreprise}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du contact *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Prénom et nom"
                        className="pl-10"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-destructive text-sm mt-1">{formErrors.name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@entreprise.sn"
                        className="pl-10"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-destructive text-sm mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+221 77 000 00 00"
                        className="pl-10"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="text-destructive text-sm mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      placeholder="Adresse complète"
                      className="pl-10"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>
                  {formErrors.address && (
                    <p className="text-destructive text-sm mt-1">{formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe *</Label>
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
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-destructive text-sm mt-1">{formErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password_confirmation">Confirmer le mot de passe *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password_confirmation"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        value={formData.password_confirmation}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formErrors.password_confirmation && (
                      <p className="text-destructive text-sm mt-1">{formErrors.password_confirmation}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-center pt-4">
                  <Button type="submit" className="gap-2 w-full" size="lg" disabled={loading}>
                    {loading ? "Création en cours..." : "Créer mon compte"}
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Déjà inscrit ?{" "}
                <Link to="/connexion" className="text-primary font-medium hover:underline">
                  Se connecter
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}