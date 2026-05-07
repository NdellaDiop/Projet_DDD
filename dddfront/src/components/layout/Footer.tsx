import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Mail, Phone, MapPin, Facebook, Linkedin, Twitter, Instagram } from "lucide-react";
import { BRAND_LOGO_PATH, BRAND_LOGO_CLASS_FOOTER } from "@/lib/branding";

const socialNetworkLinks: { label: string; Icon: LucideIcon; envUrl: string | undefined }[] = [
  { label: "Facebook", Icon: Facebook, envUrl: import.meta.env.VITE_SOCIAL_FACEBOOK_URL },
  { label: "LinkedIn", Icon: Linkedin, envUrl: import.meta.env.VITE_SOCIAL_LINKEDIN_URL },
  { label: "Instagram", Icon: Instagram, envUrl: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL },
  { label: "X (Twitter)", Icon: Twitter, envUrl: import.meta.env.VITE_SOCIAL_TWITTER_URL },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const activeSocial = socialNetworkLinks
    .map((item) => ({ ...item, href: item.envUrl?.trim() ?? "" }))
    .filter((item) => item.href.length > 0);

  return (
    <footer className="bg-footer text-footer-foreground">
      {/* Main Footer */}
      <div className="container max-w-5xl py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="group flex flex-col items-start">
              <img src={BRAND_LOGO_PATH} alt="Dakar Dem Dikk — Dem Dikk" className={BRAND_LOGO_CLASS_FOOTER} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-footer-foreground/70">
                Portail des marchés Publics
              </span>
            </Link>
            <p className="text-sm text-footer-foreground/80 leading-relaxed">
              Plateforme officielle de gestion des appels d'offres de Dakar Dem Dikk. 
              Transparence, efficacité et équité.
            </p>
            {activeSocial.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {activeSocial.map(({ label, Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-footer-foreground/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Liens Rapides
            </h3>
            <ul className="space-y-2">
              {[
                { href: "/appels-offres", label: "Appels d'Offres" },
                { href: "/comment-ca-marche", label: "Comment ça marche" },
                { href: "/inscription", label: "Devenir fournisseur" },
                { href: "/comment-ca-marche#guide-depot", label: "Dépôt des plis (guide)" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-footer-foreground/80 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                <span className="text-sm text-footer-foreground/80">
                  Km 4,5 Avenue Cheikh Anta Diop<br />
                  Dakar, Senegal
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <a
                  href="tel:+221338241010"
                  className="text-sm text-footer-foreground/80 hover:text-accent transition-colors"
                >
                  +221 33 824 10 10
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <a
                  href="mailto:appel.offre@demdikk.sn"
                  className="text-sm text-footer-foreground/80 hover:text-accent transition-colors"
                >
                  appel.offre@demdikk.sn
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-footer-foreground/10">
        <div className="container max-w-5xl flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="text-xs text-footer-foreground/60 text-center md:text-left">
            © {currentYear} Dakar Dem Dikk. Tous droits réservés.
          </p>
          <p className="text-xs text-footer-foreground/60">
            République du Sénégal — Ministère des Infrastructures et des Transports
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
