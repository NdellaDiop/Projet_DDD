<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'candidature_id',
        'appel_offre_id',
        'nom_fichier',
        'type_fichier',
        'categorie',
        'chemin_fichier',
    ];

    /**
     * Get the user who uploaded the document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the candidature that owns the document.
     */
    public function candidature(): BelongsTo
    {
        return $this->belongsTo(Candidature::class);
    }

    /**
     * Get the appel_offre that owns the document.
     */
    public function appelOffre(): BelongsTo
    {
        return $this->belongsTo(AppelOffre::class);
    }
}