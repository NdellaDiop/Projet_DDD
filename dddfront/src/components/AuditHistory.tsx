import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileClock, ArrowRight, User } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/DataTablePagination';

interface AuditLog {
  id: number;
  user_id: number;
  user?: {
    name: string;
    email: string;
  };
  event: string;
  auditable_type: string;
  auditable_id: number;
  old_values: string | null;
  new_values: string | null;
  url: string;
  ip_address: string;
  created_at: string;
}

interface AuditHistoryProps {
  auditableType?: string;
  auditableId?: number;
  title?: string;
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ auditableType, auditableId, title = "Historique des modifications" }) => {
  const { api } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    perPage: 20,
  });
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!api) return;
      const now = Date.now();
      if (now - lastFetchRef.current < 600) return;
      lastFetchRef.current = now;
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
            page: pagination.currentPage, 
            per_page: pagination.perPage 
        };
        if (auditableType) params.auditable_type = auditableType;
        if (auditableId) params.auditable_id = auditableId;

        const response = await api.get('/api/admin/audit-logs', { params });
        
        setLogs(response.data.data);
        
        setPagination(prev => {
            const newTotal = Number(response.data.total || 0);
            const newLastPage = Number(response.data.last_page || 1);
            const newCurrentPage = Number(response.data.current_page || 1);
            
            // Éviter les mises à jour inutiles et les boucles infinies
            if (
                prev.totalItems === newTotal && 
                prev.totalPages === newLastPage &&
                prev.currentPage === newCurrentPage
            ) {
                return prev;
            }
            return {
                ...prev,
                currentPage: newCurrentPage,
                totalPages: newLastPage,
                totalItems: newTotal,
            };
        });
      } catch (error) {
        console.error("Erreur chargement logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [api, pagination.currentPage, pagination.perPage, auditableType, auditableId]);

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handlePerPageChange = (perPage: number) => {
    setPagination(prev => ({ ...prev, perPage, currentPage: 1 }));
  };

  const formatEvent = (event: string) => {
    switch (event) {
      case 'created': return <Badge className="bg-green-600">Création</Badge>;
      case 'updated': return <Badge className="bg-blue-600">Modification</Badge>;
      case 'deleted': return <Badge className="bg-red-600">Suppression</Badge>;
      default: return <Badge variant="outline">{event}</Badge>;
    }
  };

  const formatModel = (type: string) => {
    const parts = type.split('\\');
    const model = parts[parts.length - 1];
    switch (model) {
      case 'AppelOffre': return "Appel d'Offre";
      case 'Fournisseur': return "Fournisseur";
      case 'User': return "Utilisateur";
      case 'Candidature': return "Candidature";
      case 'ResponsableMarche': return "Responsable";
      default: return model;
    }
  };

  const parseValues = (json: string | null) => {
    if (!json) return {};
    try {
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  };

  const renderDiff = (oldVals: string | null, newVals: string | null) => {
    const oldObj = parseValues(oldVals);
    const newObj = parseValues(newVals);
    
    // Si c'est une création, on montre juste les nouvelles valeurs
    if (Object.keys(oldObj).length === 0 && Object.keys(newObj).length > 0) {
       return (
         <div className="text-xs space-y-1">
           {Object.entries(newObj).map(([key, val]) => (
             <div key={key}><span className="font-semibold">{key}:</span> {String(val)}</div>
           ))}
         </div>
       );
    }

    // Sinon on montre les différences
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    return (
      <div className="text-xs space-y-1">
        {Array.from(keys).map(key => {
          const oldVal = oldObj[key];
          const newVal = newObj[key];
          if (oldVal !== newVal) {
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 min-w-[100px]">{key}:</span>
                <span className="text-red-500 line-through bg-red-50 px-1 rounded">{String(oldVal)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-green-600 bg-green-50 px-1 rounded">{String(newVal)}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileClock className="w-5 h-5 text-primary" />
                {title}
              </CardTitle>
            </div>
          </div>
          <CardDescription>
            Trace complète des actions effectuées {auditableId ? "sur cet élément" : "sur la plateforme"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border border-slate-100 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Utilisateur</TableHead>
                  <TableHead className="font-semibold">Action</TableHead>
                  {!auditableId && <TableHead className="font-semibold">Cible</TableHead>}
                  <TableHead className="font-semibold">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={auditableId ? 4 : 5} className="h-24 text-center">
                      <div className="flex justify-center items-center h-full">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={auditableId ? 4 : 5} className="h-24 text-center text-muted-foreground">
                      Aucun historique disponible.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50">
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                            {log.user?.name?.charAt(0) || <User className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-800">{log.user?.name || 'Système'}</span>
                            <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatEvent(log.event)}</TableCell>
                      {!auditableId && (
                        <TableCell className="text-sm font-mono text-slate-600">
                          {formatModel(log.auditable_type)} <span className="text-xs text-muted-foreground">#{log.auditable_id}</span>
                        </TableCell>
                      )}
                      <TableCell>
                        <ScrollArea className="h-[80px] w-full max-w-[450px] rounded-md border bg-slate-50 p-2">
                          {renderDiff(log.old_values, log.new_values)}
                        </ScrollArea>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditHistory;
