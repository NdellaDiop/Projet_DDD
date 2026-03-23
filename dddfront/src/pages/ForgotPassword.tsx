import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Mail, ArrowLeft, Send } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const { api } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    setLoading(true);
    try {
      // Pour les routes publiques (comme forgot-password), nous pouvons utiliser l'instance api
      // mais nous devons nous assurer que les intercepteurs ne bloquent pas si nous ne sommes pas authentifiés.
      // Si AuthContext gère déjà cela, parfait. Sinon, nous pouvons utiliser axios directement ou api.
      
      await api.get('/sanctum/csrf-cookie'); // Assurer le cookie CSRF
      await api.post("/api/forgot-password", { email });
      
      setEmailSent(true);
      toast({
        title: "Email envoyé",
        description: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
      });
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Une erreur est survenue.";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Mot de passe oublié ?</CardTitle>
          <CardDescription className="text-center">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="nom@entreprise.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Envoyer le lien
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
                Veuillez vérifier votre boîte de réception (et vos spams).
              </p>
              <Button variant="outline" className="w-full" onClick={() => setEmailSent(false)}>
                Ressayer avec une autre adresse
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <Link to="/connexion" className="flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la connexion
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
