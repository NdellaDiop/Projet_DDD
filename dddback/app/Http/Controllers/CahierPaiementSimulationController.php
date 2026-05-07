<?php

namespace App\Http\Controllers;

use App\Models\CahierAccesAchat;
use App\Services\Paiement\CahierAccesPaiementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class CahierPaiementSimulationController extends Controller
{
    public function __construct(
        private readonly CahierAccesPaiementService $cahierPaiement
    ) {}

    /**
     * Données pour afficher la page de règlement simulé (token issu de /cahier/paiement/initier).
     */
    public function preview(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur()) {
            return response()->json(['message' => 'Réservé aux comptes fournisseur.'], 403);
        }

        if (! config('paiement.simulation_enabled')) {
            return response()->json(['message' => 'Paiement simulé désactivé.'], 403);
        }

        $data = $request->validate([
            't' => 'required|string',
        ]);

        $achat = $this->resolveAchatFromToken($data['t'], $user->id);
        if ($achat instanceof JsonResponse) {
            return $achat;
        }

        $achat->load('appelOffre');
        $ao = $achat->appelOffre;

        $demoUi = null;
        try {
            $plain = Crypt::decryptString($data['t']);
            $payload = json_decode($plain, true, 512, JSON_THROW_ON_ERROR);
            if (is_array($payload)
                && isset($payload['demo_ui'])
                && in_array($payload['demo_ui'], ['wave', 'orange_money'], true)) {
                $demoUi = $payload['demo_ui'];
            }
        } catch (Throwable) {
            // déjà filtré par resolve plus bas si token invalide ; ici preview a déjà résolu l’achat
        }

        return response()->json([
            'achat_id' => $achat->id,
            'montant_xof' => $achat->montant_xof,
            'statut' => $achat->statut,
            'appel_offre' => [
                'id' => $ao->id,
                'titre' => $ao->titre,
                'reference' => $ao->reference,
            ],
            'demo_ui' => $demoUi,
            'simulation' => true,
        ]);
    }

    /**
     * Finalise l’accès au cahier sans encaissement réel (référence SIMULATION-*).
     */
    public function confirmer(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur()) {
            return response()->json(['message' => 'Réservé aux comptes fournisseur.'], 403);
        }

        if (! config('paiement.simulation_enabled')) {
            return response()->json(['message' => 'Paiement simulé désactivé.'], 403);
        }

        $data = $request->validate([
            'token' => 'required|string',
            'accepte_conditions' => 'required|accepted',
        ]);

        $achat = $this->resolveAchatFromToken($data['token'], $user->id);
        if ($achat instanceof JsonResponse) {
            return $achat;
        }

        if ($achat->isCompleted()) {
            return response()->json([
                'message' => 'Accès au cahier déjà acquis.',
                'deja_acquis' => true,
                'appel_offre_id' => $achat->appel_offre_id,
            ]);
        }

        $ref = 'SIMULATION-'.$achat->id.'-'.now()->timestamp;
        $this->cahierPaiement->marquerCommePaye($achat, $ref);

        return response()->json([
            'message' => 'Paiement simulé enregistré (aucun débit réel).',
            'statut' => CahierAccesAchat::STATUT_COMPLETED,
            'appel_offre_id' => $achat->appel_offre_id,
        ]);
    }

    private function resolveAchatFromToken(string $token, int $userId): CahierAccesAchat|JsonResponse
    {
        try {
            $plain = Crypt::decryptString($token);
            $payload = json_decode($plain, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable) {
            return response()->json(['message' => 'Lien invalide ou expiré.'], 422);
        }

        if (! is_array($payload) || ! isset($payload['achat_id'], $payload['exp'])) {
            return response()->json(['message' => 'Lien invalide.'], 422);
        }

        if ((int) $payload['exp'] < now()->timestamp) {
            return response()->json([
                'message' => 'Ce lien a expiré. Relancez le paiement simulé depuis la fiche marché.',
            ], 410);
        }

        $achat = CahierAccesAchat::query()->find((int) $payload['achat_id']);
        if (! $achat) {
            return response()->json(['message' => 'Achat introuvable.'], 404);
        }

        if ($achat->user_id !== $userId) {
            return response()->json(['message' => 'Ce paiement ne correspond pas à votre compte.'], 403);
        }

        if ($achat->provider !== CahierAccesAchat::PROVIDER_SIMULATION) {
            return response()->json(['message' => 'Ce lien ne correspond pas à un paiement simulé.'], 422);
        }

        return $achat;
    }
}
