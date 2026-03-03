<?php

namespace App\Http\Controllers;

use App\Models\Candidature;
use App\Models\CandidatureComment;
use App\Models\LogActivite;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\NotificationService;

class CandidatureCommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of comments for a candidature.
     */
    public function index(Candidature $candidature)
    {
        $user = Auth::user();

        // Charger les relations nécessaires
        $candidature->load(['fournisseur', 'appelOffre.responsableMarche']);

        // Vérifier que l'utilisateur peut voir cette candidature
        if ($user->isFournisseur()) {
            if (!$candidature->fournisseur || $candidature->fournisseur->user_id !== $user->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif ($user->isResponsableMarche()) {
            // Les responsables peuvent voir UNIQUEMENT les commentaires des candidatures liées à leurs propres appels d'offres
            if (!$candidature->appelOffre) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
            $appelOffre = $candidature->appelOffre;
            // Vérifier que c'est bien son propre appel d'offre
            if ($appelOffre->responsable_marche_id !== $user->responsableMarche->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif (!$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $comments = $candidature->comments()
            ->with(['user.role', 'document'])
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($comments);
    }

    /**
     * Store a newly created comment.
     */
    public function store(Request $request, Candidature $candidature)
    {
        $user = Auth::user();

        // Charger les relations nécessaires
        $candidature->load(['fournisseur', 'appelOffre.responsableMarche']);

        // Vérifier que l'utilisateur peut commenter cette candidature
        if ($user->isFournisseur()) {
            if (!$candidature->fournisseur || $candidature->fournisseur->user_id !== $user->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif ($user->isResponsableMarche()) {
            // Les responsables peuvent commenter UNIQUEMENT les candidatures liées à leurs propres appels d'offres
            if (!$candidature->appelOffre) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
            $appelOffre = $candidature->appelOffre;
            // Vérifier que c'est bien son propre appel d'offre
            if ($appelOffre->responsable_marche_id !== $user->responsableMarche->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif (!$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $request->validate([
            'message' => 'required|string|min:3|max:1000',
            'document_id' => 'nullable|exists:documents,id',
        ]);

        $comment = CandidatureComment::create([
            'candidature_id' => $candidature->id,
            'user_id' => $user->id,
            'message' => $request->message,
            'document_id' => $request->document_id,
        ]);

        $comment->load(['user.role', 'document']);

        // Notifier l'autre partie
        $candidature->load(['fournisseur.user', 'appelOffre.responsableMarche.user']);
        if ($user->isResponsableMarche() || $user->isAdmin()) {
            // Le responsable ou l'admin commente, notifier le fournisseur
            if ($candidature->fournisseur && $candidature->fournisseur->user && $candidature->appelOffre) {
                $appelOffre = $candidature->appelOffre;
                $message = "Nouveau commentaire sur votre candidature pour l'appel d'offre \"{$appelOffre->titre}\" (Réf: {$appelOffre->reference})";
                app(NotificationService::class)->notifyUser(
                    $candidature->fournisseur->user->id,
                    $message
                );
            }
        } elseif ($user->isFournisseur()) {
            // Le fournisseur commente, notifier le responsable (si l'appel d'offre a un responsable)
            // Si l'appel d'offre a été créé par l'admin (responsable_marche_id = null), on ne notifie personne
            // car l'admin verra le commentaire de toute façon
            if ($candidature->appelOffre && $candidature->appelOffre->responsableMarche && $candidature->appelOffre->responsableMarche->user) {
                $appelOffre = $candidature->appelOffre;
                $message = "Nouveau commentaire du fournisseur sur la candidature pour l'appel d'offre \"{$appelOffre->titre}\" (Réf: {$appelOffre->reference})";
                app(NotificationService::class)->notifyUser(
                    $candidature->appelOffre->responsableMarche->user->id,
                    $message
                );
            }
        }

        $this->log('create_candidature_comment', "Commentaire créé pour candidature #{$candidature->id}");

        return response()->json($comment, 201);
    }

    /**
     * Display the specified comment.
     */
    public function show(Candidature $candidature, CandidatureComment $comment)
    {
        $user = Auth::user();

        // Vérifier que le commentaire appartient à la candidature
        if ($comment->candidature_id !== $candidature->id) {
            return response()->json(['message' => 'Commentaire non trouvé pour cette candidature.'], 404);
        }

        // Charger les relations nécessaires
        $candidature->load(['fournisseur', 'appelOffre.responsableMarche']);

        // Vérifier les permissions
        if ($user->isFournisseur()) {
            if (!$candidature->fournisseur || $candidature->fournisseur->user_id !== $user->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif ($user->isResponsableMarche()) {
            // Les responsables peuvent voir UNIQUEMENT les commentaires des candidatures liées à leurs propres appels d'offres
            if (!$candidature->appelOffre) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
            $appelOffre = $candidature->appelOffre;
            // Vérifier que c'est bien son propre appel d'offre
            if ($appelOffre->responsable_marche_id !== $user->responsableMarche->id) {
                return response()->json(['message' => 'Non autorisé.'], 403);
            }
        } elseif (!$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $comment->load(['user.role', 'document']);

        return response()->json($comment);
    }

    /**
     * Update the specified comment.
     */
    public function update(Request $request, Candidature $candidature, CandidatureComment $comment)
    {
        $user = Auth::user();

        // Vérifier que le commentaire appartient à la candidature
        if ($comment->candidature_id !== $candidature->id) {
            return response()->json(['message' => 'Commentaire non trouvé pour cette candidature.'], 404);
        }

        // Seul l'auteur peut modifier son commentaire
        if ($comment->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $request->validate([
            'message' => 'required|string|min:3|max:1000',
        ]);

        $comment->update([
            'message' => $request->message,
        ]);

        $comment->load(['user.role', 'document']);

        $this->log('update_candidature_comment', "Commentaire #{$comment->id} modifié");

        return response()->json($comment);
    }

    /**
     * Remove the specified comment.
     */
    public function destroy(Candidature $candidature, CandidatureComment $comment)
    {
        $user = Auth::user();

        // Vérifier que le commentaire appartient à la candidature
        if ($comment->candidature_id !== $candidature->id) {
            return response()->json(['message' => 'Commentaire non trouvé pour cette candidature.'], 404);
        }

        // Seul l'auteur ou un admin peut supprimer
        if ($comment->user_id !== $user->id && !$user->isAdmin()) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $comment->delete();

        $this->log('delete_candidature_comment', "Commentaire #{$comment->id} supprimé");

        return response()->json(null, 204);
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
