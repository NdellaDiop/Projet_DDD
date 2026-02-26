import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Contact() {
  const { api, user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    nom: user?.name || "",
    email: user?.email || "",
    sujet: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Créer une instance axios pour les appels publics
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const axiosInstance = api || axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    // Validation
    if (!formData.email || !formData.sujet || !formData.message) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    if (formData.message.length < 10) {
      toast({
        title: "Erreur",
        description: "Le message doit contenir au moins 10 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await axiosInstance.post("/api/contact", formData);
      setIsSubmitted(true);
      setFormData({
        nom: user?.name || "",
        email: user?.email || "",
        sujet: "",
        message: "",
      });
      toast({
        title: "Message envoyé !",
        description: "Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.",
      });
    } catch (error: any) {
      console.error("Erreur envoi message:", error);
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors ? 
                            Object.values(error.response.data.errors).flat().join(', ') : 
                            "Erreur lors de l'envoi du message");
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Contactez-nous
              </h1>
              <p className="text-lg text-muted-foreground">
                Une question ? Une suggestion ? Nous sommes là pour vous aider.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Informations de contact */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Informations de contact</CardTitle>
                    <CardDescription>
                      N'hésitez pas à nous contacter pour toute question
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Adresse</h3>
                        <p className="text-sm text-muted-foreground">
                          Km 4,5 Avenue Cheikh Anta Diop<br />
                          Dakar, Sénégal
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Téléphone</h3>
                        <a
                          href="tel:+221338241010"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          +221 33 824 10 10
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm mb-1">Email</h3>
                        <a
                          href="mailto:appels-offres@demdikk.sn"
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          appels-offres@demdikk.sn
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Formulaire de contact */}
              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">Envoyez-nous un message</CardTitle>
                    <CardDescription>
                      Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSubmitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Message envoyé !</h3>
                        <p className="text-muted-foreground mb-6">
                          Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.
                        </p>
                        <Button onClick={() => setIsSubmitted(false)}>
                          Envoyer un autre message
                        </Button>
                      </motion.div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="nom">
                              Nom {!isAuthenticated && <span className="text-destructive">*</span>}
                            </Label>
                            <Input
                              id="nom"
                              name="nom"
                              type="text"
                              value={formData.nom}
                              onChange={handleChange}
                              placeholder="Votre nom"
                              disabled={isAuthenticated}
                              required={!isAuthenticated}
                            />
                            {isAuthenticated && (
                              <p className="text-xs text-muted-foreground">
                                Prérempli depuis votre compte
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">
                              Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="votre@email.com"
                              disabled={isAuthenticated}
                              required
                            />
                            {isAuthenticated && (
                              <p className="text-xs text-muted-foreground">
                                Prérempli depuis votre compte
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="sujet">
                            Sujet <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="sujet"
                            name="sujet"
                            type="text"
                            value={formData.sujet}
                            onChange={handleChange}
                            placeholder="Objet de votre message"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">
                            Message <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Décrivez votre question ou votre demande..."
                            className="min-h-[150px]"
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum 10 caractères
                          </p>
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Envoyer le message
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
