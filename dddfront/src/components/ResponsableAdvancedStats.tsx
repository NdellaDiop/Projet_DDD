import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  Briefcase,
  Megaphone,
  Archive,
  FileEdit,
  UserX,
} from "lucide-react";

interface ResponsableAdvancedStatsProps {
  className?: string;
}

interface AOEvolutionItem {
  month: string;
  count: number;
}

interface StatutItem {
  statut: string;
  count: number;
}

interface AdvancedStatsPayload {
  scope?: "global" | "prm";
  totalAO: number;
  draftAO?: number;
  publishedAO: number;
  closedAO: number;
  unassignedAO?: number;
  aoEvolution: AOEvolutionItem[];
  statutDistribution?: StatutItem[];
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "#f59e0b" },
  published: { label: "Publié", color: "#0d9488" },
  closed: { label: "Clôturé", color: "#dc2626" },
  archived: { label: "Archivé", color: "#64748b" },
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Juin",
  "07": "Juil",
  "08": "Aoû",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Déc",
};

function formatMonthLabel(month: string): string {
  const [, mm] = month.split("-");
  return MONTH_LABELS[mm] ?? month;
}

function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

const ResponsableAdvancedStats: React.FC<ResponsableAdvancedStatsProps> = ({ className }) => {
  const { api, isGestionnaire } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdvancedStatsPayload | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!api) return;
      try {
        const response = await api.get("/api/responsable/dashboard-advanced-stats");
        setData(response.data);
      } catch (error) {
        console.error("Erreur chargement stats avancées:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="py-12 text-center text-muted-foreground">
          Impossible de charger les statistiques pour le moment.
        </CardContent>
      </Card>
    );
  }

  const draftAO = data.draftAO ?? 0;
  const unassignedAO = data.unassignedAO ?? 0;
  const isGlobal = data.scope === "global" || isGestionnaire;

  const kpiCards = [
    {
      title: isGlobal ? "Tous les appels d'offres" : "Mes appels d'offres",
      value: data.totalAO,
      subtitle: isGlobal ? "Vue globale du portail" : "Total sous votre responsabilité",
      icon: Briefcase,
      accent: "bg-slate-100 text-slate-700",
      bar: "bg-slate-400",
      ratio: 100,
    },
    {
      title: "Publiés",
      value: data.publishedAO,
      subtitle: `${percent(data.publishedAO, data.totalAO)} % du total`,
      icon: Megaphone,
      accent: "bg-teal-50 text-teal-700",
      bar: "bg-teal-500",
      ratio: percent(data.publishedAO, data.totalAO),
    },
    {
      title: "Brouillons",
      value: draftAO,
      subtitle: `${percent(draftAO, data.totalAO)} % du total`,
      icon: FileEdit,
      accent: "bg-amber-50 text-amber-700",
      bar: "bg-amber-500",
      ratio: percent(draftAO, data.totalAO),
    },
    {
      title: "Clôturés",
      value: data.closedAO,
      subtitle: `${percent(data.closedAO, data.totalAO)} % du total`,
      icon: Archive,
      accent: "bg-rose-50 text-rose-700",
      bar: "bg-rose-500",
      ratio: percent(data.closedAO, data.totalAO),
    },
  ];

  if (isGlobal) {
    kpiCards.push({
      title: "Non assignés",
      value: unassignedAO,
      subtitle: "AO sans PRM",
      icon: UserX,
      accent: "bg-orange-50 text-orange-700",
      bar: "bg-orange-500",
      ratio: percent(unassignedAO, data.totalAO),
    });
  }

  const evolution = data.aoEvolution.map((item) => ({
    name: formatMonthLabel(item.month),
    AppelsOffres: Number(item.count) || 0,
  }));

  const statutPie = (data.statutDistribution ?? []).map((item) => {
    const meta = STATUS_META[item.statut] ?? {
      label: item.statut,
      color: "#94a3b8",
    };
    return {
      name: meta.label,
      value: Number(item.count) || 0,
      color: meta.color,
    };
  });

  return (
    <div className={`space-y-6 ${className ?? ""}`}>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isGlobal ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-4`}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">{card.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{card.subtitle}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${card.bar} transition-all`}
                    style={{ width: `${Math.max(card.ratio, card.value > 0 ? 6 : 0)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-700" />
              {isGlobal ? "Évolution des appels d'offres" : "Évolution de mes appels d'offres"}
            </CardTitle>
            <CardDescription>Publications sur les 6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {evolution.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Aucune publication sur la période.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAoBrand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                      }}
                      labelStyle={{ color: "#334155", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="AppelsOffres"
                      name="Appels d'offres"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorAoBrand)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Répartition par statut</CardTitle>
            <CardDescription>
              {isGlobal ? "Ensemble des marchés du portail" : "Répartition de vos marchés"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              {statutPie.length === 0 || statutPie.every((s) => s.value === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Aucune donnée à afficher.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statutPie}
                      cx="50%"
                      cy="46%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statutPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} (${percent(value, data.totalAO)} %)`,
                        name,
                      ]}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResponsableAdvancedStats;
