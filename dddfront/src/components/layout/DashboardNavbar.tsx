import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield, Briefcase, Building2, LogOut, LayoutDashboard, Home, ChevronDown, User as UserIcon, Settings } from "lucide-react";

type Props = {
  title?: string;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
};

export default function DashboardNavbar({ title, onOpenProfile, onOpenSettings, onLogout }: Props) {
  const { user, isAdmin, isResponsableMarche, isFournisseur, logout } = useAuth();

  const dashboardHref = isAdmin
    ? "/admin"
    : isResponsableMarche
      ? "/responsable/dashboard"
      : isFournisseur
        ? "/fournisseur/dashboard"
        : "/";

  const RoleIcon = isAdmin ? Shield : isResponsableMarche ? Briefcase : Building2;
  const roleLabel = user?.role?.name ?? "";
  const userName = user?.name ?? "Utilisateur";
  const userEmail = user?.email ?? "";
  const handleLogout = onLogout ?? logout;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="w-full px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo (retour Accueil) */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Dakar Dem Dikk" className="h-9 w-auto" />
          </Link>

          {/* Profil à droite */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 px-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-slate-800">{userName}</span>
                  {userEmail && <span className="text-xs text-slate-500">{userEmail}</span>}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {roleLabel || "Compte"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onOpenProfile && (
                <DropdownMenuItem className="gap-2" onClick={onOpenProfile}>
                  <UserIcon className="h-4 w-4" />
                  Mon profil
                </DropdownMenuItem>
              )}
              {onOpenSettings && (
                <DropdownMenuItem className="gap-2" onClick={onOpenSettings}>
                  <Settings className="h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

