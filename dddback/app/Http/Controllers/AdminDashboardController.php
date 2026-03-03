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
        $fournisseursActifs = Fournisseur::whereHas('user', function ($query) {
            $query->where('is_active', true);
        })->count();

        $fournisseursEnAttente = Fournisseur::whereHas('user', function ($query) {
            $query->where('is_active', false);
        })->count();

        $totalAppelsOffres = AppelOffre::count();
        $appelsOffresActifs = AppelOffre::where('statut', AppelOffre::STATUS_PUBLISHED)->count();
        $appelsOffresClotures = AppelOffre::where('statut', AppelOffre::STATUS_CLOSED)->count();

        $totalCandidatures = Candidature::count();
        $candidaturesEnCours = Candidature::where('statut', Candidature::STATUS_SUBMITTED)->count();
        $candidaturesRetenues = Candidature::where('statut', Candidature::STATUS_ACCEPTED)->count();
        $candidaturesRejetees = Candidature::where('statut', Candidature::STATUS_REJECTED)->count();

        $totalResponsables = ResponsableMarche::count();

        return response()->json([
            'totalFournisseurs' => $totalFournisseurs,
            'fournisseursActifs' => $fournisseursActifs,
            'fournisseursEnAttente' => $fournisseursEnAttente,
            'totalAppelsOffres' => $totalAppelsOffres,
            'appelsOffresActifs' => $appelsOffresActifs,
            'appelsOffresClotures' => $appelsOffresClotures,
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
        
        $appelsOffres = $query->orderBy('date_publication', 'desc')
            ->paginate($perPage)
            ->through(function ($ao) {
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
            });

        return response()->json($appelsOffres);
    }

    /**
     * Récupère la liste des fournisseurs.
     */
    public function getFournisseurs(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search', '');
        $statut = $request->get('statut', '');
        
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
        
        // Filtre par statut
        if ($statut === 'actif') {
            $query->whereHas('user', function($q) {
                $q->where('is_active', true);
            });
        } elseif ($statut === 'en_attente') {
            $query->whereHas('user', function($q) {
                $q->where('is_active', false);
            });
        }
        
        $fournisseurs = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->through(function ($f) {
                return [
                    'id' => $f->id,
                    'raison_sociale' => $f->nom_entreprise,
                    'ninea' => $f->ninea ?? 'N/A',
                    'email' => $f->email_contact,
                    'telephone' => $f->telephone,
                    'statut' => $f->user->is_active ? 'actif' : 'en_attente',
                    'date_inscription' => $f->created_at->format('Y-m-d'),
                    'nombre_candidatures' => $f->candidatures_count,
                    'domaines_activite' => [],
                ];
            });

        return response()->json($fournisseurs);
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
        
        $responsables = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->through(function ($r) {
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
            });

        return response()->json($responsables);
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
     * Valide un compte fournisseur.
     */
    public function validateFournisseur(Fournisseur $fournisseur)
    {
        if ($fournisseur->user) {
            $fournisseur->user->is_active = true;
            $fournisseur->user->save();

            // Try-catch pour éviter le crash si l'envoi de mail échoue
            try {
                $this->log('validate_fournisseur', "Validation fournisseur #{$fournisseur->id}");
                app(NotificationService::class)->notifyUser(
                    $fournisseur->user->id,
                    'Votre compte a été validé.'
                );
            } catch (\Exception $e) {
                // On continue même si la notif plante
            }

            return response()->json(['message' => 'Fournisseur validé avec succès.']);
        }

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