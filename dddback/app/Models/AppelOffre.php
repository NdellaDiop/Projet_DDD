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

    public const SOURCE_FONDS_PROPRES = 'fonds_propres';
    public const SOURCE_ETAT = 'etat';
    public const SOURCE_FINANCEMENT_EXTERIEURE = 'financement_exterieure';

    /**
     * @return array<string, string>
     */
    public static function sourceFinancementLabels(): array
    {
        return [
            self::SOURCE_FONDS_PROPRES => 'Fonds propres',
            self::SOURCE_ETAT => 'État',
            self::SOURCE_FINANCEMENT_EXTERIEURE => 'Financement extérieure',
        ];
    }
    
    use HasFactory;

    protected $table = 'appels_offres';

    protected $fillable = [
        'responsable_marche_id',
        'titre',
        'reference',
        'source_financement',
        'description',
        'modalites_soumission_physique',
        'date_publication',
        'date_limite_depot',
        'statut',
        'cahier_paiement_requis',
        'cahier_prix_xof',
    ];

    protected $casts = [
        'date_publication' => 'datetime',
        'date_limite_depot' => 'datetime',
        'cahier_paiement_requis' => 'boolean',
        'cahier_prix_xof' => 'integer',
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

    /**
     * Achats d’accès au cahier des charges (Wave / Orange Money, etc.).
     *
     * @return HasMany<CahierAccesAchat, $this>
     */
    public function cahierAccesAchats(): HasMany
    {
        return $this->hasMany(CahierAccesAchat::class, 'appel_offre_id');
    }
}