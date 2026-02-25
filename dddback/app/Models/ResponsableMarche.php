<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResponsableMarche extends Model
{
    use HasFactory;

    protected $table = 'responsables_marche';

    protected $fillable = [
        'user_id',
        'departement',
        'fonction',
        'telephone',
        'photo_profil',
    ];

    /**
     * Get the user that owns the responsable_marche.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the appels_offres for the responsable_marche.
     */
    public function appelsOffres(): HasMany
    {
        return $this->hasMany(AppelOffre::class);
    }
}