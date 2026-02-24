<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Fournisseur extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'nom_entreprise',
        'adresse',
        'telephone',
        'email_contact',
        'ninea',
        'rccm',
        'quitus_fiscal',
    ];

    /**
     * Get the user that owns the fournisseur.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the candidatures for the fournisseur.
     */
    public function candidatures(): HasMany
    {
        return $this->hasMany(Candidature::class);
    }
}