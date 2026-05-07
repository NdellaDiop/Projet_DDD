<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CahierAccesAchat extends Model
{
    public const STATUT_PENDING = 'pending';
    public const STATUT_COMPLETED = 'completed';
    public const STATUT_FAILED = 'failed';
    public const STATUT_CANCELLED = 'cancelled';

    public const PROVIDER_WAVE = 'wave';
    public const PROVIDER_ORANGE_MONEY = 'orange_money';
    public const PROVIDER_SIMULATION = 'simulation';

    protected $table = 'cahier_acces_achats';

    protected $fillable = [
        'user_id',
        'appel_offre_id',
        'montant_xof',
        'provider',
        'statut',
        'reference_externe',
        'paye_le',
    ];

    protected function casts(): array
    {
        return [
            'paye_le' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appelOffre(): BelongsTo
    {
        return $this->belongsTo(AppelOffre::class, 'appel_offre_id');
    }

    public function isCompleted(): bool
    {
        return $this->statut === self::STATUT_COMPLETED;
    }
}
