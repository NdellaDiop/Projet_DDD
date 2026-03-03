<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppelOffre extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_CLOSED = 'closed';
    public const STATUS_ARCHIVED = 'archived';
    
    use HasFactory;

    protected $table = 'appels_offres';

    protected $fillable = [
        'responsable_marche_id',
        'titre',
        'reference',
        'description',
        'date_publication',
        'date_limite_depot',
        'statut',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appelOffre) {
            if (empty($appelOffre->reference)) {
                $appelOffre->reference = 'AO-' . date('Y') . '-' . strtoupper(uniqid());
            }
        });
    }

    protected $casts = [
        'date_publication' => 'datetime',
        'date_limite_depot' => 'datetime',
    ];

    /**
     * Get the responsable_marche that owns the appel_offre.
     */
    public function responsableMarche(): BelongsTo
    {
        return $this->belongsTo(ResponsableMarche::class, 'responsable_marche_id');
    }

    /**
     * Get the candidatures for the appel_offre.
     */
    public function candidatures(): HasMany
    {
        return $this->hasMany(Candidature::class);
    }

    /**
     * Get the documents for the appel_offre.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}