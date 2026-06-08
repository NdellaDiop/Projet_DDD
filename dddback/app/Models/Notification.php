<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    public const AUDIENCE_USER = 'user';

    public const AUDIENCE_ADMIN = 'admin';

    public const AUDIENCE_PRM = 'prm';

    protected $fillable = [
        'user_id',
        'message',
        'audience',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Messages réservés aux administrateurs (validation de dossiers tiers, etc.).
     */
    public static function isAdminOnlyMessage(string $message): bool
    {
        $needles = [
            'Nouveau dossier fournisseur à valider',
            'validé automatiquement',
            'Vérifiez les pièces légales avant validation',
        ];

        foreach ($needles as $needle) {
            if (str_contains($message, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Messages destinés au responsable de marché, pas au fournisseur.
     */
    public static function isPrmOnlyMessage(string $message): bool
    {
        $needles = [
            "vous a été assigné",
            'Nouveau dossier / soumission enregistré',
            'Nouveau commentaire du fournisseur sur le dossier',
        ];

        foreach ($needles as $needle) {
            if (str_contains($message, $needle)) {
                return true;
            }
        }

        return false;
    }

    public function isVisibleToFournisseur(): bool
    {
        if ($this->audience === self::AUDIENCE_ADMIN || $this->audience === self::AUDIENCE_PRM) {
            return false;
        }

        return ! self::isAdminOnlyMessage($this->message)
            && ! self::isPrmOnlyMessage($this->message);
    }
}