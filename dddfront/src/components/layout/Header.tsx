import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, UserPlus, User } from "lucide-react";
import { BRAND_LOGO_PATH, BRAND_LOGO_CLASS_HEADER } from "@/lib/branding";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const roleId =
    typeof user === "object" && user !== null && "role_id" in user
      ? (user as { role_id?: number }).role_id
      : undefined;

  const getDashboardLink = () => {
    if (user?.role?.name === "ADMIN" || roleId === 1) return "/admin";
    if (user?.role?.name === "GESTIONNAIRE" || roleId === 4) return "/gestionnaire/dashboard";
    if (user?.role?.name === "FOURNISSEUR" || roleId === 3) return "/fournisseur/dashboard";
    if (user?.role?.name === "RESPONSABLE_MARCHE" || roleId === 2) return "/responsable/dashboard";
    return "/appels-offres";
  };

  const navLinks = [
    { href: "/", label: "Accueil" },
    { href: "/appels-offres", label: "Appels d'Offres" },
    { href: "/comment-ca-marche", label: "Comment ça marche" },
    { href: "/contact", label: "Contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      {/* Pleine largeur « container » (sans max-w-5xl) pour limiter les bandes blanches vides sur grand écran */}
      <div className="container flex min-h-[3.25rem] items-center justify-between gap-2 py-2 md:min-h-[3.75rem] md:gap-3 md:py-2.5">
        {/* Marque : logo + libellé sur une ligne (à partir de sm) */}
        <Link
          to="/"
          className="group flex shrink-0 items-center"
        >
          <img
            src={BRAND_LOGO_PATH}
            alt="Dakar Dem Dikk — portail des marchés publics"
            className={BRAND_LOGO_CLASS_HEADER}
          />
        </Link>

        {/* Desktop : liens centrés pour équilibrer l’espace entre marque et actions */}
        <nav className="mx-2 hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors xl:px-4 ${
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:gap-3 lg:flex">
          {isAuthenticated ? (
            <Button size="sm" asChild>
              <Link to={getDashboardLink()} className="gap-2">
                <User className="h-4 w-4" />
                Mon Espace
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/connexion" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Connexion
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/inscription" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  S&apos;inscrire
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Ouvrir le menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="animate-fade-in border-t border-border bg-card lg:hidden">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <p className="px-4 pt-2 text-xs text-muted-foreground">
              Portail des marchés publics — Dakar Dem Dikk
            </p>
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link to={getDashboardLink()} onClick={() => setIsMenuOpen(false)}>
                    <User className="mr-2 h-4 w-4" />
                    Mon Espace
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/connexion" onClick={() => setIsMenuOpen(false)}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Connexion
                    </Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/inscription" onClick={() => setIsMenuOpen(false)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      S&apos;inscrire
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
