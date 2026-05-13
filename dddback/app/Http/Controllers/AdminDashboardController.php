<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AppelOffre;
use App\Models\Document;
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
                $q->where('titre', 'LIKE', "%{$search}%")
                  ->orWhere('description', 'LIKE', "%{$search}%")
                  ->orWhere('reference', 'LIKE', "%{$search}%");
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
        $sourceLabel = $ao->source_financement
            ? (\App\Models\AppelOffre::sourceFinancementLabels()[$ao->source_financement] ?? $ao->source_financement)
            : null;
        $typeLabel = $ao->type_marche
            ? (\App\Models\AppelOffre::typesMarcheLabels()[$ao->type_marche] ?? $ao->type_marche)
            : null;

        return [
            'id' => $ao->id,
            'titre' => $ao->titre,
            'reference' => $ao->reference,
            'statut' => $ao->statut,
            'description' => $ao->description,
            'modalites_soumission_physique' => $ao->modalites_soumission_physique,
            'source_financement' => $ao->source_financement,
            'source_financement_label' => $sourceLabel,
            'mode_passation' => $ao->mode_passation,
            'type_marche' => $ao->type_marche,
            'type_marche_label' => $typeLabel,
            'cahier_paiement_requis' => (bool) ($ao->cahier_paiement_requis ?? false),
            'cahier_prix_xof' => $ao->cahier_prix_xof !== null ? (int) $ao->cahier_prix_xof : null,
            'date_publication' => $ao->date_publication,
            'date_cloture' => $ao->date_limite_depot,
            'date_limite_depot' => $ao->date_limite_depot,
            'nombre_candidatures' => $ao->candidatures_count,
            'attribution_statut' => $ao->attribution_statut,
            'attributaire_nom' => $ao->attributaire_nom,
            'attribution_montant_xof' => $ao->attribution_montant_xof !== null ? (int) $ao->attribution_montant_xof : null,
            'attribution_date' => $ao->attribution_date,
            'responsable_marche_id' => $ao->responsable_marche_id,
            'responsable' => $ao->responsableMarche
                ? [
                    'name' => $ao->responsableMarche->user ? $ao->responsableMarche->user->name : 'Responsable inconnu',
                    'email' => $ao->responsableMarche->user?->email,
                    'fonction' => $ao->responsableMarche->fonction,
                    'departement' => $ao->responsableMarche->departement,
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
        
        $query = Fournisseur::with(['user', 'user.documents' => function ($q) {
                $q->select('id', 'user_id', 'categorie')
                  ->whereIn('categorie', Document::allLegalUploadCategories());
            }])
            ->withCount('candidatures');
        
        // Recherche
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('nom_entreprise', 'LIKE', "%{$search}%")
                  ->orWhere('email_contact', 'LIKE', "%{$search}%")
                  ->orWhere('ninea', 'LIKE', "%{$search}%")
                  ->orWhere('telephone', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'LIKE', "%{$search}%")
                         ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }
        
        // Filtres spécifiques
        if ($raisonSociale) {
            $query->where('nom_entreprise', 'LIKE', "%{$raisonSociale}%");
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
        // Calcul de la complétude du dossier légal
        $docs = optional($f->user)->documents ?? collect();
        $presentes = $docs->pluck('categorie')->unique()->values()->all();
        $obligatoires = Document::LEGAL_CATEGORIES;
        $manquantes = array_values(array_diff($obligatoires, $presentes));
        $obligatoiresPresentes = array_values(array_intersect($obligatoires, $presentes));

        return [
            'id' => $f->id,
            'raison_sociale' => $f->nom_entreprise,
            'ninea' => $f->ninea ?? 'N/A',
            'rccm' => $f->rccm ?? null,
            'email' => $f->email_contact,
            'telephone' => $f->telephone,
            'statut' => $f->statut, // Utilisation de la nouvelle colonne
            'date_inscription' => $f->created_at->format('Y-m-d'),
            'nombre_candidatures' => $f->candidatures_count,
            'references_professionnelles' => $f->references_professionnelles,
            'domaines_activite' => [],

            // Synthèse documents légaux (pour activer/désactiver la validation côté UI)
            'documents_legaux_count' => $docs->count(),
            'pieces_obligatoires_presentes' => $obligatoiresPresentes,
            'pieces_obligatoires_manquantes' => $manquantes,
            'dossier_complet' => empty($manquantes),
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
                $q->where('departement', 'LIKE', "%{$search}%")
                  ->orWhere('fonction', 'LIKE', "%{$search}%")
                  ->orWhere('telephone', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($uq) use ($search) {
                      $uq->where('name', 'LIKE', "%{$search}%")
                         ->orWhere('email', 'LIKE', "%{$search}%");
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
        $aoEvolution = AppelOffre::selectRaw("DATE_FORMAT(date_publication, '%Y-%m') as month, count(*) as count")
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
        $aoEvolution = AppelOffre::selectRaw("DATE_FORMAT(date_publication, '%Y-%m') as month, count(*) as count")
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
     *
     * La validation est refusée si une des pièces légales obligatoires est absente :
     * le dossier doit être complet avant que l'administrateur ne valide.
     */
    public function validateFournisseur(Fournisseur $fournisseur)
    {
        \Illuminate\Support\Facades\Log::info("Début validation fournisseur #{$fournisseur->id}");

        if (! $fournisseur->user) {
            \Illuminate\Support\Facades\Log::warning("Utilisateur introuvable pour fournisseur #{$fournisseur->id}");
            return response()->json(['message' => 'Utilisateur associé introuvable pour ce fournisseur.'], 404);
        }

        // Vérification de la complétude du dossier légal
        $presentes = Document::query()
            ->where('user_id', $fournisseur->user->id)
            ->whereIn('categorie', Document::LEGAL_CATEGORIES)
            ->pluck('categorie')
            ->unique()
            ->values()
            ->all();
        $manquantes = array_values(array_diff(Document::LEGAL_CATEGORIES, $presentes));

        if (! empty($manquantes)) {
            $labels = Document::legalCategoryLabels();
            $libelles = array_map(fn ($c) => $labels[$c] ?? $c, $manquantes);

            return response()->json([
                'message' => 'Dossier incomplet : impossible de valider tant que les pièces obligatoires ne sont pas présentes.',
                'pieces_manquantes' => $manquantes,
                'libelles_manquantes' => $libelles,
            ], 422);
        }

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