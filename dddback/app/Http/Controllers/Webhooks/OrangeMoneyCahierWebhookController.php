<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\CahierAccesAchat;
use App\Services\Paiement\CahierAccesPaiementService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Notification Orange Money WebPay (notif_url).
 * Corps typique : status=SUCCESS, order_id, pay_token / notif_token.
 */
class OrangeMoneyCahierWebhookController extends Controller
{
    public function __construct(
        private readonly CahierAccesPaiementService $cahierPaiement
    ) {}

    public function handle(Request $request): Response
    {
        $secret = config('paiement.orange_money.webhook_secret');
        $auth = (string) $request->header('Authorization', '');
        if (is_string($secret) && $secret !== '' && $auth !== '') {
            $expected = 'Bearer '.$secret;
            if (! hash_equals($expected, $auth)) {
                return response('Non autorisé', 401);
            }
        }

        $json = $request->all();
        $status = $json['status'] ?? $json['payment_status'] ?? $json['txnstatus'] ?? null;
        $ok = in_array(strtoupper((string) $status), ['PAID', 'SUCCESS', 'COMPLETED', 'SUCCESSFUL'], true);
        if (! $ok) {
            Log::info('Webhook Orange Money ignoré (statut non payé)', ['status' => $status]);

            return response('OK', 200);
        }

        $orderRaw = $json['order_id'] ?? $json['merchant_order_id'] ?? $json['reference'] ?? null;
        $payToken = $json['pay_token'] ?? $json['notif_token'] ?? $json['txnid'] ?? null;

        $achat = null;
        if (is_string($payToken) && $payToken !== '') {
            $achat = CahierAccesAchat::query()
                ->where('provider', CahierAccesAchat::PROVIDER_ORANGE_MONEY)
                ->where('reference_externe', $payToken)
                ->first();
        }

        if (! $achat && $orderRaw !== null) {
            $id = (int) preg_replace('/\D+/', '', (string) $orderRaw);
            if ($id > 0) {
                $achat = CahierAccesAchat::query()
                    ->where('id', $id)
                    ->where('provider', CahierAccesAchat::PROVIDER_ORANGE_MONEY)
                    ->first();
            }
        }

        if (! $achat) {
            Log::warning('Webhook Orange : achat introuvable', $json);

            return response('OK', 200);
        }

        $this->cahierPaiement->marquerCommePaye(
            $achat,
            is_string($payToken) && $payToken !== '' ? $payToken : ($achat->reference_externe ?? (string) $achat->id)
        );

        return response('OK', 200);
    }
}
