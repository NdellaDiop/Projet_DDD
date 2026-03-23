import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, Award } from 'lucide-react';

interface AdvancedStatsProps {
  className?: string;
}

interface AOEvolutionItem {
  month: string;
  count: number;
}

interface FournisseurStatItem {
  statut: string;
  count: number;
}

interface TopResponsableItem {
  name: string;
  count: number;
}

interface FormattedPieItem {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const AdvancedStats: React.FC<AdvancedStatsProps> = ({ className }) => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    aoEvolution: AOEvolutionItem[];
    fournisseurStats: FournisseurStatItem[];
    topResponsables: TopResponsableItem[];
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!api) return;
      try {
        const response = await api.get('/api/admin/dashboard-advanced-stats');
        setData(response.data);
      } catch (error) {
        console.error("Erreur chargement stats avancées:", error);
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

  const formattedFournisseurStats: FormattedPieItem[] = data.fournisseurStats.map((item: FournisseurStatItem) => ({
    name: item.statut.charAt(0).toUpperCase() + item.statut.slice(1).replace('_', ' '),
    value: item.count,
    color: item.statut === 'actif' ? '#16a34a' : (item.statut === 'en_attente' ? '#ea580c' : '#dc2626')
  }));

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {/* 1. Évolution des Appels d'Offres */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-2 shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Évolution des Appels d'Offres
          </CardTitle>
          <CardDescription>Publications sur les 6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedAOEvolution}>
                <defs>
                  <linearGradient id="colorAo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="AppelsOffres" stroke="#2563eb" fillOpacity={1} fill="url(#colorAo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Répartition des Fournisseurs */}
      <Card className="shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Statut des Fournisseurs
          </CardTitle>
          <CardDescription>Répartition actuelle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedFournisseurStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {formattedFournisseurStats.map((entry, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Responsables */}
      <Card className="col-span-1 md:col-span-3 lg:col-span-3 shadow-sm border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Top Responsables de Marché
          </CardTitle>
          <CardDescription>Par nombre d'appels d'offres gérés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.topResponsables}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedStats;
