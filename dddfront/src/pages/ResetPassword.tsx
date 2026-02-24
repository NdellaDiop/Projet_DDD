import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const tokenParam = searchParams.get("token");

    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    if (password !== passwordConfirmation) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.get('/sanctum/csrf-cookie');
      await api.post("/api/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSuccess(true);
      toast({
        title: "Mot de passe réinitialisé",
        description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
      });
      setTimeout(() => navigate("/connexion"), 3000);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Impossible de réinitialiser le mot de passe.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Réinitialiser le mot de passe</CardTitle>
          <CardDescription className="text-center">
            Créez un nouveau mot de passe sécurisé pour votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="email" value={email} />
              
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="passwordConfirmation"
                    type="password"
                    placeholder="••••••••"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Réinitialiser le mot de passe"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Votre mot de passe a été réinitialisé avec succès.
                Vous allez être redirigé vers la page de connexion...
              </p>
              <Button className="w-full" onClick={() => navigate("/connexion")}>
                Se connecter maintenant
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
    </div>
  );
}
