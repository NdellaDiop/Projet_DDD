<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Numéro de téléphone sénégalais : 9 chiffres.
 * - Mobile : 70, 71, 76, 77, 78… (tout préfixe 7X)
 * - Fixe : 33, 34… (préfixe 3X)
 * Indicatif +221 / 221 accepté en tête.
 */
class SenegalPhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::isValid($value)) {
            $fail('Le numéro de téléphone doit être un numéro sénégalais valide (ex. 70, 71, 76, 77, 78… — 9 chiffres, ou +221 77 123 45 67).');
        }
    }

    public static function isValid(?string $value): bool
    {
        if ($value === null || trim($value) === '') {
            return false;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if ($digits === null || $digits === '') {
            return false;
        }

        if (strlen($digits) === 12 && str_starts_with($digits, '221')) {
            $digits = substr($digits, 3);
        }

        return (bool) preg_match('/^[37]\d{8}$/', $digits);
    }

    /** Normalise vers le format local à 9 chiffres (ex. 771234567). */
    public static function normalize(?string $value): ?string
    {
        if (! self::isValid($value)) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if (strlen($digits) === 12 && str_starts_with($digits, '221')) {
            $digits = substr($digits, 3);
        }

        return $digits;
    }
}
