import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, UserPlus, User } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const getDashboardLink = () => {
    if (user?.role?.name === 'ADMIN' || (user as any)?.role_id === 1) return '/admin';
    if (user?.role?.name === 'FOURNISSEUR' || (user as any)?.role_id === 3) return '/fournisseur/dashboard';
    if (user?.role?.name === 'RESPONSABLE_MARCHE' || (user as any)?.role_id === 2) return '/responsable/dashboard';
    return '/appels-offres';
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
      <div className="container flex h-16 items-center justify-between md:h-20">
        {/* Logo */}
        <Link to="/" className="flex flex-col items-center group">
          <img src="/logo.png" alt="Dakar Dem Dikk Logo" className="h-10 w-auto mb-1" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Portail Appels d'Offres
            </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                isActive(link.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
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
                  S'inscrire
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border bg-card lg:hidden animate-fade-in">
          <nav className="container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-3 text-sm font-medium transition-colors rounded-lg ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
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
                      S'inscrire
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
