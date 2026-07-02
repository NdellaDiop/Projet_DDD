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

    public const TYPE_TRAVAUX = 'travaux';
    public const TYPE_FOURNITURES = 'fournitures';
    public const TYPE_SERVICES_COURANTS = 'services_courants';
    public const TYPE_PRESTATIONS_INTELLECTUELLES = 'prestations_intellectuelles';

    /** Pièces obligatoires avant publication d'un AO. */
    public const REQUIRED_AO_DOCUMENTS = ['AVIS_APPEL_OFFRES', 'CAHIER_DES_CHARGES'];

    /**
     * @return array<string, string>
     */
    public static function requiredAoDocumentLabels(): array
    {
        return [
            'AVIS_APPEL_OFFRES' => "Avis d'appel d'offres",
            'CAHIER_DES_CHARGES' => 'Cahier des charges',
        ];
    }

    /**
     * Catégories de pièces AO encore absentes (documents relation chargée ou requête légère).
     *
     * @return list<string>
     */
    public function piecesAoManquantes(): array
    {
        $present = $this->relationLoaded('documents')
            ? $this->documents->pluck('categorie')->unique()->all()
            : $this->documents()
                ->whereIn('categorie', self::REQUIRED_AO_DOCUMENTS)
                ->pluck('categorie')
                ->unique()
                ->all();

        return array_values(array_diff(self::REQUIRED_AO_DOCUMENTS, $present));
    }

    public function piecesAoCompletes(): bool
    {
        return $this->piecesAoManquantes() === [];
    }

    /**
     * La date limite de dépôt des plis est dépassée (après la fin du jour calendaire).
     */
    public function dateLimiteDepotDepassee(): bool
    {
        if (! $this->date_limite_depot) {
            return false;
        }

        return now()->isAfter($this->date_limite_depot->copy()->endOfDay());
    }

    /**
     * Un fournisseur peut encore initier l'achat du cahier des charges (marché publié, échéance non dépassée).
     */
    public function acquisitionCahierAutorisee(): bool
    {
        if ($this->statut !== self::STATUS_PUBLISHED) {
            return false;
        }

        return ! $this->dateLimiteDepotDepassee();
    }

    /**
     * @return array<string, string>
     */
    public static function sourceFinancementLabels(): array
    {
        return [
            self::SOURCE_FONDS_PROPRES => 'Fonds propres',
            self::SOURCE_ETAT => 'État',
            // Libellé corrigé : « extérieur » (sans « e ») ; la valeur stockée reste 'financement_exterieure' pour compat.
            self::SOURCE_FINANCEMENT_EXTERIEURE => 'Financement extérieur',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function typesMarcheLabels(): array
    {
        return [
            self::TYPE_TRAVAUX => 'Travaux',
            self::TYPE_FOURNITURES => 'Fournitures',
            self::TYPE_SERVICES_COURANTS => 'Services courants',
            self::TYPE_PRESTATIONS_INTELLECTUELLES => 'Prestations intellectuelles',
        ];
    }
    
    use HasFactory;

    protected $table = 'appels_offres';

    protected $fillable = [
        'responsable_marche_id',
        'titre',
        'reference',
        'source_financement',
        'mode_passation',
        'type_marche',
        'description',
        'modalites_soumission_physique',
        'date_publication',
        'date_limite_depot',
        'statut',
        'cahier_paiement_requis',
        'cahier_prix_xof',
        'attribution_statut',
        'attributaire_nom',
        'attributaire_ninea',
        'attribution_montant_xof',
        'attribution_date',
        'attribution_commentaire',
        'attribution_par_user_id',
    ];

    protected $casts = [
        'date_publication' => 'datetime',
        'date_limite_depot' => 'datetime',
        'cahier_paiement_requis' => 'boolean',
        'cahier_prix_xof' => 'integer',
        'attribution_montant_xof' => 'integer',
        'attribution_date' => 'datetime',
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