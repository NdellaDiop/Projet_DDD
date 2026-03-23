<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AppelOffre;
use App\Models\Fournisseur;
use App\Models\ResponsableMarche;
use App\Models\LogActivite;
use App\Models\Candidature;
use App\Services\NotificationService;

class AdminDashboardController extends Controller
{
    /**
     * Récupère les statistiques globales du tableau de bord.
     */
    public function getDashboardStats()
    {
        $totalFournisseurs = Fournisseur::count();
        $fournisseursActifs = Fournisseur::where('statut', 'actif')->count();
        $fournisseursEnAttente = Fournisseur::where('statut', 'en_attente')->count();
        $fournisseursRejetes = Fournisseur::where('statut', 'rejete')->count();

        $totalAppelsOffres = AppelOffre::count();
        $appelsOffresActifs = AppelOffre::where('statut', AppelOffre::STATUS_PUBLISHED)->count();
        $appelsOffresClotures = AppelOffre::where('statut', AppelOffre::STATUS_CLOSED)->count();
        $appelsOffresBrouillon = AppelOffre::where('statut', AppelOffre::STATUS_DRAFT)->count();

        $totalCandidatures = Candidature::count();
        $candidaturesEnCours = Candidature::where('statut', Candidature::STATUS_SUBMITTED)->count();
        $candidaturesRetenues = Candidature::where('statut', Candidature::STATUS_ACCEPTED)->count();
        $candidaturesRejetees = Candidature::where('statut', Candidature::STATUS_REJECTED)->count();

        $totalResponsables = ResponsableMarche::count();

        return response()->json([
            'totalFournisseurs' => $totalFournisseurs,
            'fournisseursActifs' => $fournisseursActifs,
            'fournisseursEnAttente' => $fournisseursEnAttente,
            'fournisseursRejetes' => $fournisseursRejetes,
            'totalAppelsOffres' => $totalAppelsOffres,
            'appelsOffresActifs' => $appelsOffresActifs,
            'appelsOffresClotures' => $appelsOffresClotures,
            'appelsOffresBrouillon' => $appelsOffresBrouillon,
            'totalCandidatures' => $totalCandidatures,
            'candidaturesEnCours' => $candidaturesEnCours,
            'candidaturesRetenues' => $candidaturesRetenues,
            'candidaturesRejetees' => $candidaturesRejetees,
            'totalResponsables' => $totalResponsables,
        ]);
    }

    /**
     * Récupère la liste des appels d'offres.
     */
    public function getAppelsOffres(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        $dateDebut = $request->get('date_debut', '');
        $dateFin = $request->get('date_fin', '');
        
        $query = AppelOffre::with('responsableMarche.user')
            ->withCount('candidatures');
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('titre', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%")
                  ->orWhere('reference', 'ilike', "%{$search}%");
            });
        }
        
        // Filtre par statut
        if ($statut) {
            $query->where('statut', $statut);
        }
        
        // Filtre par plage de dates (publication)
        if ($dateDebut) {
            $query->whereDate('date_publication', '>=', $dateDebut);
        }
        if ($dateFin) {
            $query->whereDate('date_publication', '<=', $dateFin);
        }
        
        if ($request->has('all')) {
            $appelsOffres = $query->orderBy('date_publication', 'desc')
                ->get()
                ->map(function ($ao) {
                    return $this->formatAppelOffre($ao);
                });
        } else {
        $appelsOffres = $query->orderBy('date_publication', 'desc')
            ->paginate($perPage)
            ->through(function ($ao) {
                    return $this->formatAppelOffre($ao);
                });
        }

        return response()->json($appelsOffres);
    }

    private function formatAppelOffre($ao)
    {
                return [
                    'id' => $ao->id,
                    'titre' => $ao->titre,
                    'reference' => $ao->reference,
                    'statut' => $ao->statut,
                    'date_publication' => $ao->date_publication,
                    'date_cloture' => $ao->date_limite_depot,
                    'nombre_candidatures' => $ao->candidatures_count,
            'responsable_marche_id' => $ao->responsable_marche_id,
            'responsable' => $ao->responsableMarche
                        ? [
                    'name' => $ao->responsableMarche->user ? $ao->responsableMarche->user->name : 'Responsable inconnu',
                        ]
                : null,
                ];
    }

    /**
     * Récupère la liste des fournisseurs.
     */
    public function getFournisseurs(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        $raisonSociale = $request->get('raison_sociale', '');
        
        $query = Fournisseur::with('user')
            ->withCount('candidatures');
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('nom_entreprise', 'ilike', "%{$search}%")
                  ->orWhere('email_contact', 'ilike', "%{$search}%")
                  ->orWhere('ninea', 'ilike', "%{$search}%")
                  ->orWhere('telephone', 'ilike', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('email', 'ilike', "%{$search}%");
                  });
            });
        }
        
        // Filtres spécifiques
        if ($raisonSociale) {
            $query->where('nom_entreprise', 'ilike', "%{$raisonSociale}%");
        }
        
        // Filtre par statut
        if ($statut) {
            $query->where('statut', $statut);
        }

        // Filtre par domaines d'activité (simulé pour l'instant car pas de colonne 'domaines')
        // Dans un cas réel, on ferait un whereHas ou whereJsonContains
        
        if ($request->has('all')) {
            $fournisseurs = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($f) {
                    return $this->formatFournisseur($f);
            });
        } else {
        $fournisseurs = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->through(function ($f) {
                    return $this->formatFournisseur($f);
                });
        }

        return response()->json($fournisseurs);
    }

    private function formatFournisseur($f)
    {
                return [
                    'id' => $f->id,
                    'raison_sociale' => $f->nom_entreprise,
                    'ninea' => $f->ninea ?? 'N/A',
                    'email' => $f->email_contact,
                    'telephone' => $f->telephone,
            'statut' => $f->statut, // Utilisation de la nouvelle colonne
                    'date_inscription' => $f->created_at->format('Y-m-d'),
                    'nombre_candidatures' => $f->candidatures_count,
                    'domaines_activite' => [],
                ];
    }

    /**
     * Récupère la liste des responsables de marché.
     */
    public function getResponsables(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        
        $query = ResponsableMarche::with('user')
            ->withCount('appelsOffres');
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('departement', 'ilike', "%{$search}%")
                  ->orWhere('fonction', 'ilike', "%{$search}%")
                  ->orWhere('telephone', 'ilike', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('email', 'ilike', "%{$search}%");
                  });
            });
        }
        
        if ($request->has('all')) {
            $responsables = $query->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($r) {
                    return $this->formatResponsable($r);
                });
        } else {
        $responsables = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->through(function ($r) {
                    return $this->formatResponsable($r);
                });
        }

        return response()->json($responsables);
    }

    private function formatResponsable($r)
    {
                return [
                    'id' => $r->id,
                    'user_id' => $r->user_id,
                    'departement' => $r->departement,
                    'fonction' => $r->fonction,
                    'telephone' => $r->telephone,
                    'user' => [
                        'name' => $r->user->name ?? 'N/A',
                        'email' => $r->user->email ?? 'N/A',
                    ],
                    'nombre_appels_offres' => $r->appels_offres_count,
                ];
    }

    /**
     * Récupère les activités récentes.
     */
    public function getRecentActivities()
    {
        $activities = LogActivite::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($activity) {
                return [
                    'id' => $activity->id,
                    'action' => $activity->action,
                    'details' => $activity->details,
                    'user' => $activity->user->name ?? 'Système',
                    'date' => $activity->created_at->format('Y-m-d H:i'),
                ];
            });

        return response()->json($activities);
    }

    /**
     * Récupère les statistiques avancées pour les graphiques.
     */
    public function getAdvancedStats()
    {
        // 1. Évolution des appels d'offres sur les 6 derniers mois
        $sixMonthsAgo = now()->subMonths(6);
        $aoEvolution = AppelOffre::selectRaw("TO_CHAR(date_publication, 'YYYY-MM') as month, count(*) as count")
            ->where('date_publication', '>=', $sixMonthsAgo)
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // 2. Répartition des fournisseurs par statut
        $fournisseurStats = Fournisseur::selectRaw('statut, count(*) as count')
            ->groupBy('statut')
            ->get();

        // 3. Top 5 des responsables par nombre d'AO
        $topResponsables = ResponsableMarche::withCount('appelsOffres')
            ->orderBy('appels_offres_count', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($r) {
                return [
                    'name' => $r->user->name ?? 'Inconnu',
                    'count' => $r->appels_offres_count
                ];
            });

        return response()->json([
            'aoEvolution' => $aoEvolution,
            'fournisseurStats' => $fournisseurStats,
            'topResponsables' => $topResponsables
        ]);
    }

    /**
     * Récupère les statistiques avancées pour le responsable de marché.
     */
    public function getResponsableAdvancedStats()
    {
        $user = auth()->user();
        if (!$user->responsableMarche) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }
        $responsableId = $user->responsableMarche->id;

        // Stats globales
        $totalAO = AppelOffre::where('responsable_marche_id', $responsableId)->count();
        $publishedAO = AppelOffre::where('responsable_marche_id', $responsableId)
            ->where('statut', 'published')->count();
        $closedAO = AppelOffre::where('responsable_marche_id', $responsableId)
            ->where('statut', 'closed')->count();
        
        $totalCandidatures = Candidature::join('appels_offres', 'candidatures.appel_offre_id', '=', 'appels_offres.id')
            ->where('appels_offres.responsable_marche_id', $responsableId)
            ->count();

        // 1. Évolution de ses appels d'offres sur les 6 derniers mois
        $sixMonthsAgo = now()->subMonths(6);
        $aoEvolution = AppelOffre::selectRaw("TO_CHAR(date_publication, 'YYYY-MM') as month, count(*) as count")
            ->where('responsable_marche_id', $responsableId)
            ->where('date_publication', '>=', $sixMonthsAgo)
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // 2. Répartition des statuts des candidatures reçues sur ses AO
        $candidatureStats = Candidature::join('appels_offres', 'candidatures.appel_offre_id', '=', 'appels_offres.id')
            ->where('appels_offres.responsable_marche_id', $responsableId)
            ->selectRaw('candidatures.statut, count(*) as count')
            ->groupBy('candidatures.statut')
            ->get();

        return response()->json([
            'totalAO' => $totalAO,
            'publishedAO' => $publishedAO,
            'closedAO' => $closedAO,
            'totalCandidatures' => $totalCandidatures,
            'aoEvolution' => $aoEvolution,
            'candidatureStats' => $candidatureStats,
        ]);
    }

    /**
     * Valide un compte fournisseur.
     */
    public function validateFournisseur(Fournisseur $fournisseur)
    {
        \Illuminate\Support\Facades\Log::info("Début validation fournisseur #{$fournisseur->id}");

        if ($fournisseur->user) {
            $fournisseur->user->is_active = true;
            $fournisseur->user->save();
            
            $fournisseur->statut = 'actif';
            $fournisseur->save();

            \Illuminate\Support\Facades\Log::info("Utilisateur activé.");

            // Try-catch pour éviter le crash si l'envoi de mail échoue
            try {
                $this->log('validate_fournisseur', "Validation fournisseur #{$fournisseur->id}");
                
                $notificationService = app(NotificationService::class);
                
                // Notification interne (base de données)
                $notificationService->notifyUser(
                    $fournisseur->user->id,
                    'Votre compte a été validé. Vous pouvez maintenant accéder à la plateforme.'
                );

                \Illuminate\Support\Facades\Log::info("Tentative envoi mail à: " . $fournisseur->user->email);
                // Envoi de l'email de confirmation
                $notificationService->sendAccountValidatedEmail($fournisseur->user);
                \Illuminate\Support\Facades\Log::info("Mail envoyé avec succès (théoriquement).");

            } catch (\Exception $e) {
                // Loguer l'erreur pour le débogage
                \Illuminate\Support\Facades\Log::error("Erreur envoi email validation: " . $e->getMessage());
            }

            return response()->json(['message' => 'Fournisseur validé avec succès.']);
        }

        \Illuminate\Support\Facades\Log::warning("Utilisateur introuvable pour fournisseur #{$fournisseur->id}");
        return response()->json(['message' => 'Utilisateur associé introuvable pour ce fournisseur.'], 404);
    }

    /**
     * Rejette un compte fournisseur.
     */
    public function rejectFournisseur(Fournisseur $fournisseur)
    {
        if ($fournisseur->user) {
            $fournisseur->user->is_active = false;
            $fournisseur->user->save();
            
            $fournisseur->statut = 'rejete';
            $fournisseur->save();

            try {
            $this->log('reject_fournisseur', "Rejet fournisseur #{$fournisseur->id}");
            app(NotificationService::class)->notifyUser(
                    $fournisseur->user->id,
                    'Votre compte a été rejeté.'
                );
            } catch (\Exception $e) {
                // On continue même si la notif plante
            }
            return response()->json(['message' => 'Fournisseur rejeté avec succès.']);
        }

        return response()->json(['message' => 'Utilisateur associé introuvable pour ce fournisseur.'], 404);
    }

    private function log(string $action, string $details): void
    {
        LogActivite::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'details' => $details,
            'ip_address' => request()->ip(),
        ]);
    }
}