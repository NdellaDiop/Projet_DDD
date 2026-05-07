<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\CahierAccesAchat;
use App\Services\Paiement\CahierAccesPaiementService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Webhook générique : à adapter au contrat Orange (champ d’ID commande, statut).
 * Par défaut on attend : Authorization: Bearer {ORANGE_MONEY_WEBHOOK_SECRET}
 * et un JSON { "order_id": <id cahier_acces_achats>, "status": "paid" | "success" }.
 */
class OrangeMoneyCahierWebhookController extends Controller
{
    public function __construct(
        private readonly CahierAccesPaiementService $cahierPaiement
    ) {}

    public function handle(Request $request): Response
    {
        $secret = config('paiement.orange_money.webhook_secret');
        if (empty($secret)) {
            return response('Non configuré', 503);
        }

        $auth = $request->header('Authorization', '');
        $expected = 'Bearer '.$secret;
        if (! hash_equals($expected, $auth)) {
            return response('Non autorisé', 401);
        }

        $json = $request->json()->all();
        $orderId = $json['order_id'] ?? $json['merchant_order_id'] ?? null;
        $status = $json['status'] ?? $json['payment_status'] ?? null;

        if ($orderId === null) {
            Log::warning('Webhook Orange Money sans order_id', $json);

            return response('OK', 200);
        }

        $ok = in_array((string) $status, ['paid', 'success', 'completed', 'SUCCESS', 'PAID'], true);
        if (! $ok) {
            return response('OK', 200);
        }

        $achat = CahierAccesAchat::query()
            ->where('id', (int) $orderId)
            ->where('provider', CahierAccesAchat::PROVIDER_ORANGE_MONEY)
            ->first();

        if (! $achat) {
            Log::warning('Webhook Orange : achat introuvable', ['order_id' => $orderId]);

            return response('OK', 200);
        }

        $this->cahierPaiement->marquerCommePaye($achat, $json['transaction_id'] ?? $achat->reference_externe);

        return response('OK', 200);
    }
}
