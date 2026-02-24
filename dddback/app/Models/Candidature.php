<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Candidature extends Model
{
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_UNDER_REVIEW = 'under_review';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';
    
    use HasFactory;

    protected $fillable = [
        'appel_offre_id',
        'fournisseur_id',
        'date_soumission',
        'statut',
        'commentaires',
    ];

    protected $casts = [
        'date_soumission' => 'datetime',
    ];

    /**
     * Get the appel_offre that owns the candidature.
     */
    public function appelOffre(): BelongsTo
    {
        return $this->belongsTo(AppelOffre::class);
    }

    /**
     * Get the fournisseur that owns the candidature.
     */
    public function fournisseur(): BelongsTo
    {
        return $this->belongsTo(Fournisseur::class);
    }

    /**
     * Get the documents for the candidature.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}