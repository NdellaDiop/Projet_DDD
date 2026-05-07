<?php

namespace App\Services\Paiement;

/**
 * Vérification du header Wave-Signature pour les webhooks.
 *
 * @see https://docs.wave.com/webhook
 */
class WaveWebhookVerifier
{
    public function verify(string $rawBody, ?string $waveSignatureHeader, string $webhookSecret): bool
    {
        if ($waveSignatureHeader === null || $waveSignatureHeader === '') {
            return false;
        }

        $parts = explode(',', $waveSignatureHeader);
        $timestamp = null;
        $signatures = [];

        foreach ($parts as $part) {
            $part = trim($part);
            if (str_starts_with($part, 't=')) {
                $timestamp = substr($part, 2);
            } elseif (str_starts_with($part, 'v1=')) {
                $signatures[] = substr($part, 3);
            }
        }

        if ($timestamp === null || $signatures === []) {
            return false;
        }

        $now = time();
        $ts = (int) $timestamp;
        if ($ts < $now - 300 || $ts > $now + 30) {
            return false;
        }

        $computed = hash_hmac('sha256', $timestamp.$rawBody, $webhookSecret);

        return in_array($computed, $signatures, true);
    }
}
