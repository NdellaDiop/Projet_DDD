import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, Briefcase, Megaphone, Archive } from 'lucide-react';

interface ResponsableAdvancedStatsProps {
  className?: string;
}

interface AOEvolutionItem {
  month: string;
  count: number;
}

interface CandidatureStatItem {
  statut: string;
  count: number;
}

interface FormattedPieItem {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ResponsableAdvancedStats: React.FC<ResponsableAdvancedStatsProps> = ({ className }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalAO: number;
    publishedAO: number;
    closedAO: number;
    totalCandidatures: number;
    aoEvolution: AOEvolutionItem[];
    candidatureStats: CandidatureStatItem[];
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!api) return;
      try {
        const response = await api.get('/api/responsable/dashboard-advanced-stats');
        setData(response.data);
      } catch (error) {
        console.error("Erreur chargement stats avancées responsable:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  // Formatter les données pour les graphiques
  const formattedAOEvolution = data.aoEvolution.map((item: AOEvolutionItem) => ({
    name: item.month,
    AppelsOffres: item.count
  }));

  const formattedCandidatureStats: FormattedPieItem[] = data.candidatureStats.map((item: CandidatureStatItem) => ({
    name: item.statut.charAt(0).toUpperCase() + item.statut.slice(1).replace('_', ' '),
    value: item.count,
    // Couleurs basées sur le statut (à adapter selon vos constantes)
    color: item.statut === 'accepted' ? '#16a34a' : 
           item.statut === 'rejected' ? '#dc2626' : 
           item.statut === 'submitted' ? '#2563eb' : '#94a3b8'
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. CARTES GLOBALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="p-3 bg-blue-50 rounded-full mb-4">
                      <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Appels d'Offres</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.totalAO}</h3>
              </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="p-3 bg-green-50 rounded-full mb-4">
                      <Megaphone className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Publiés</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.publishedAO}</h3>
              </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="p-3 bg-purple-50 rounded-full mb-4">
                      <Users className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Candidatures reçues</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.totalCandidatures}</h3>
              </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="p-3 bg-orange-50 rounded-full mb-4">
                      <Archive className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Clôturés</p>
                  <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.closedAO}</h3>
              </CardContent>
          </Card>
      </div>

      {/* 2. GRAPHIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Évolution de MES Appels d'Offres */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Évolution de mes AO
          </CardTitle>
          <CardDescription>Publications sur les 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedAOEvolution}>
                <defs>
                  <linearGradient id="colorRespAo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="AppelsOffres" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRespAo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Statut des Candidatures Reçues */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Candidatures reçues
          </CardTitle>
          <CardDescription>Répartition par statut</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedCandidatureStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {formattedCandidatureStats.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
};

export default ResponsableAdvancedStats;
