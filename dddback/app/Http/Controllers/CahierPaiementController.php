<?php

namespace App\Http\Controllers;

use App\Models\AppelOffre;
use App\Models\CahierAccesAchat;
use App\Services\Paiement\CahierAccesPaiementService;
use App\Services\Paiement\OrangeMoneyPaymentClient;
use App\Services\Paiement\WaveCheckoutClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use RuntimeException;

class CahierPaiementController extends Controller
{
    public function __construct(
        private readonly CahierAccesPaiementService $cahierPaiement
    ) {}

    /**
     * Récapitulatif pour la page de paiement unifiée (choix du moyen, montant, préremplissage).
     */
    public function preview(Request $request, AppelOffre $appelOffre): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur() || ! $user->fournisseur) {
            return response()->json(['message' => 'Réservé aux comptes fournisseur.'], 403);
        }

        if (! in_array($appelOffre->statut, [AppelOffre::STATUS_PUBLISHED, AppelOffre::STATUS_CLOSED], true)) {
            return response()->json(['message' => 'Marché non disponible.'], 404);
        }

        if (! $appelOffre->cahier_paiement_requis || (int) ($appelOffre->cahier_prix_xof ?? 0) <= 0) {
            return response()->json(['message' => 'Aucun paiement requis pour le cahier des charges de ce marché.'], 422);
        }

        $deja = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('appel_offre_id', $appelOffre->id)
            ->where('statut', CahierAccesAchat::STATUT_COMPLETED)
            ->exists();

        $achatEnCours = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('appel_offre_id', $appelOffre->id)
            ->where('statut', CahierAccesAchat::STATUT_PENDING)
            ->first();

        $user->loadMissing('fournisseur');
        $telephone = $user->telephone ?? $user->fournisseur?->telephone;

        return response()->json([
            'appel_offre' => [
                'id' => $appelOffre->id,
                'titre' => $appelOffre->titre,
                'reference' => $appelOffre->reference,
            ],
            'montant_xof' => (int) $appelOffre->cahier_prix_xof,
            'deja_acquis' => $deja,
            'achat_statut' => $achatEnCours?->statut,
            'paiement_wave_active' => (bool) config('paiement.wave.enabled'),
            'paiement_orange_money_active' => (bool) config('paiement.orange_money.enabled'),
            'cahier_simulation_active' => (bool) config('paiement.simulation_enabled'),
            'fournisseur' => [
                'nom' => $user->name,
                'email' => $user->email,
                'telephone' => is_string($telephone) ? $telephone : null,
            ],
        ]);
    }

    /**
     * Crée la ligne d’achat et retourne une URL de paiement (Wave ou Orange Money).
     */
    public function initier(Request $request, AppelOffre $appelOffre): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur() || ! $user->fournisseur) {
            return response()->json(['message' => 'Réservé aux comptes fournisseur.'], 403);
        }

        if (! in_array($appelOffre->statut, [AppelOffre::STATUS_PUBLISHED, AppelOffre::STATUS_CLOSED], true)) {
            return response()->json(['message' => 'Marché non disponible.'], 404);
        }

        if (! $appelOffre->cahier_paiement_requis || (int) ($appelOffre->cahier_prix_xof ?? 0) <= 0) {
            return response()->json(['message' => 'Aucun paiement requis pour le cahier des charges de ce marché.'], 422);
        }

        $data = $request->validate([
            'provider' => 'required|string|in:wave,orange_money,simulation',
            /** Décor UX uniquement si provider = simulation (parcours type Wave / OM sans API réelle). */
            'demo_ui' => 'nullable|string|in:wave,orange_money',
        ]);

        $deja = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('appel_offre_id', $appelOffre->id)
            ->where('statut', CahierAccesAchat::STATUT_COMPLETED)
            ->exists();
        if ($deja) {
            return response()->json([
                'message' => 'Accès au cahier déjà acquis.',
                'deja_acquis' => true,
            ]);
        }

        $achat = CahierAccesAchat::query()->updateOrCreate(
            [
                'user_id' => $user->id,
                'appel_offre_id' => $appelOffre->id,
            ],
            [
                'montant_xof' => (int) $appelOffre->cahier_prix_xof,
                'provider' => $data['provider'],
                'statut' => CahierAccesAchat::STATUT_PENDING,
                'reference_externe' => null,
                'paye_le' => null,
            ]
        );

        try {
            if ($data['provider'] === CahierAccesAchat::PROVIDER_SIMULATION) {
                if (! config('paiement.simulation_enabled')) {
                    return response()->json([
                        'message' => 'Paiement simulé désactivé. Activez CAHIER_PAIEMENT_SIMULATION=true dans .env (démo uniquement, aucun débit réel).',
                    ], 403);
                }

                $demoUi = $data['demo_ui'] ?? null;
                $tokenPayload = [
                    'achat_id' => $achat->id,
                    'exp' => now()->addMinutes(45)->timestamp,
                ];
                if (is_string($demoUi) && in_array($demoUi, ['wave', 'orange_money'], true)) {
                    $tokenPayload['demo_ui'] = $demoUi;
                }

                $token = Crypt::encryptString((string) json_encode($tokenPayload));

                $frontend = rtrim((string) config('paiement.frontend_url'), '/');
                $paymentUrl = $frontend.'/paiement/cahier/simulation?t='.rawurlencode($token);

                return response()->json([
                    'message' => 'Redirection vers la page de règlement (simulation — inspirée du parcours réservation, sans encaissement réel).',
                    'payment_url' => $paymentUrl,
                    'simulation' => true,
                    'achat_id' => $achat->id,
                    'montant_xof' => $achat->montant_xof,
                    'provider' => CahierAccesAchat::PROVIDER_SIMULATION,
                    'statut' => $achat->statut,
                ], 201);
            }

            if ($data['provider'] === CahierAccesAchat::PROVIDER_WAVE) {
                if (! config('paiement.wave.enabled')) {
                    return response()->json([
                        'message' => 'Paiement Wave non activé. Définissez WAVE_CHECKOUT_ENABLED=true et WAVE_API_KEY dans .env.',
                    ], 503);
                }

                $wave = app(WaveCheckoutClient::class);
                $session = $wave->createCheckoutSession($achat, $appelOffre);
                $achat->update(['reference_externe' => $session['id']]);

                return response()->json([
                    'message' => 'Redirection vers Wave pour régler le montant du cahier des charges.',
                    'payment_url' => $session['wave_launch_url'],
                    'achat_id' => $achat->id,
                    'montant_xof' => $achat->montant_xof,
                    'provider' => $achat->provider,
                    'statut' => $achat->fresh()->statut,
                    'session_id' => $session['id'],
                ], 201);
            }

            if ($data['provider'] === CahierAccesAchat::PROVIDER_ORANGE_MONEY) {
                if (! config('paiement.orange_money.enabled')) {
                    return response()->json([
                        'message' => 'Paiement Orange Money non activé. Définissez ORANGE_MONEY_WEBPAY_ENABLED=true et ORANGE_MONEY_INIT_URL dans .env.',
                    ], 503);
                }

                $url = app(OrangeMoneyPaymentClient::class)->createPaymentUrl($achat, $appelOffre);

                return response()->json([
                    'message' => 'Redirection vers Orange Money.',
                    'payment_url' => $url,
                    'achat_id' => $achat->id,
                    'montant_xof' => $achat->montant_xof,
                    'provider' => $achat->provider,
                    'statut' => $achat->statut,
                ], 201);
            }
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Fournisseur de paiement inconnu.'], 422);
    }

    /**
     * Statut du paiement cahier pour le marché (polling après redirection Wave / OM).
     */
    public function statut(Request $request, AppelOffre $appelOffre): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur()) {
            return response()->json(['message' => 'Réservé aux fournisseurs.'], 403);
        }

        $achat = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('appel_offre_id', $appelOffre->id)
            ->latest('id')
            ->first();

        if (! $achat) {
            return response()->json([
                'statut' => null,
                'deja_acquis' => false,
                'message' => 'Aucun paiement en cours pour ce marché.',
            ]);
        }

        if ($achat->isCompleted()) {
            return response()->json([
                'statut' => $achat->statut,
                'deja_acquis' => true,
                'achat_id' => $achat->id,
                'paye_le' => $achat->paye_le?->toIso8601String(),
            ]);
        }

        if (
            $achat->provider === CahierAccesAchat::PROVIDER_WAVE
            && $achat->reference_externe
            && config('paiement.wave.allow_sync_verify')
        ) {
            try {
                $session = app(WaveCheckoutClient::class)->getCheckoutSession($achat->reference_externe);
                $complete = ($session['checkout_status'] ?? '') === 'complete'
                    && (($session['payment_status'] ?? '') === 'succeeded');
                if ($complete) {
                    $this->cahierPaiement->marquerCommePaye($achat, $session['id'] ?? $achat->reference_externe);
                    $achat->refresh();

                    return response()->json([
                        'statut' => $achat->statut,
                        'deja_acquis' => true,
                        'achat_id' => $achat->id,
                        'paye_le' => $achat->paye_le?->toIso8601String(),
                    ]);
                }
            } catch (RuntimeException) {
                /* webhook ou nouvelle tentative */
            }
        }

        return response()->json([
            'statut' => $achat->statut,
            'deja_acquis' => false,
            'achat_id' => $achat->id,
            'provider' => $achat->provider,
        ]);
    }

    /**
     * Secours : après retour utilisateur, interroge Wave pour finaliser si le webhook n’a pas encore été reçu.
     * À utiliser surtout en développement (WAVE_ALLOW_SYNC_VERIFY=true).
     */
    public function verifierSessionWave(Request $request, AppelOffre $appelOffre): JsonResponse
    {
        if (! config('paiement.wave.allow_sync_verify')) {
            return response()->json([
                'message' => 'Vérification synchrone désactivée. Activez WAVE_ALLOW_SYNC_VERIFY=true pour les tests.',
            ], 403);
        }

        $user = $request->user();
        if (! $user || ! $user->isFournisseur()) {
            return response()->json(['message' => 'Réservé aux fournisseurs.'], 403);
        }

        $achat = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('appel_offre_id', $appelOffre->id)
            ->where('provider', CahierAccesAchat::PROVIDER_WAVE)
            ->first();

        if (! $achat) {
            return response()->json(['message' => 'Aucun paiement Wave en cours pour ce marché.'], 404);
        }

        if ($achat->isCompleted()) {
            return response()->json([
                'message' => 'Accès déjà acquis.',
                'statut' => $achat->statut,
                'deja_acquis' => true,
            ]);
        }

        if (! $achat->reference_externe) {
            return response()->json(['message' => 'Session Wave introuvable. Réessayez depuis « Payer (Wave) ».'], 422);
        }

        try {
            $session = app(WaveCheckoutClient::class)->getCheckoutSession($achat->reference_externe);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        $complete = ($session['checkout_status'] ?? '') === 'complete'
            && (($session['payment_status'] ?? '') === 'succeeded');

        if ($complete) {
            $this->cahierPaiement->marquerCommePaye($achat, $session['id'] ?? $achat->reference_externe);

            return response()->json([
                'message' => 'Paiement confirmé.',
                'statut' => CahierAccesAchat::STATUT_COMPLETED,
                'deja_acquis' => true,
            ]);
        }

        return response()->json([
            'message' => 'Paiement pas encore finalisé côté Wave.',
            'statut' => $achat->statut,
            'wave' => [
                'checkout_status' => $session['checkout_status'] ?? null,
                'payment_status' => $session['payment_status'] ?? null,
            ],
        ]);
    }
}
