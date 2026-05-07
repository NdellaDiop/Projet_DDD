<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    /**
     * Documents légaux obligatoires pour un fournisseur (avant candidature, etc.).
     *
     * @var list<string>
     */
    public const LEGAL_CATEGORIES = [
        'RCCM',
        'NINEA',
        'QUITUS_FISCAL',
        'ATTESTATION_IPRES',
        'ATTESTATION_CSS',
        'ATTESTATION_NON_FAILLITE',
        'ATTESTATION_ARCOP',
    ];

    /** Documents complémentaires (non obligatoires pour postuler). */
    public const LEGAL_OPTIONAL_CATEGORIES = [
        'AUTRE',
    ];

    /**
     * Catégories autorisées pour l’upload « documents légaux » (obligatoires + optionnelles).
     *
     * @return list<string>
     */
    public static function allLegalUploadCategories(): array
    {
        return array_values(array_unique(array_merge(self::LEGAL_CATEGORIES, self::LEGAL_OPTIONAL_CATEGORIES)));
    }

    /**
     * Libellés affichés (messages API, e-mails, UI).
     *
     * @return array<string, string>
     */
    public static function legalCategoryLabels(): array
    {
        return [
            'RCCM' => 'Justificatif RCCM (PDF/Image)',
            'NINEA' => 'Justificatif NINEA (PDF/Image)',
            'QUITUS_FISCAL' => 'Quitus fiscal',
            'ATTESTATION_IPRES' => 'Attestation IPRES',
            'ATTESTATION_CSS' => 'Attestation Caisse de sécurité sociale (CSS)',
            'ATTESTATION_NON_FAILLITE' => 'Attestation de non-faillite',
            'ATTESTATION_ARCOP' => 'Attestation ARCOP',
            'AUTRE' => 'Autres documents (optionnel)',
        ];
    }

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

    /**
     * Pièces « générales » d’un AO : avis, règlement, annexe (téléchargement sans achat cahier).
     *
     * @return list<string>
     */
    public static function appelOffrePiecesGratuitesFournisseur(): array
    {
        return ['AVIS_APPEL_OFFRES', 'REGLEMENT_CONSULTATION', 'ANNEXE_AO'];
    }

    /**
     * Un fournisseur peut-il télécharger cette pièce jointe à un AO publié / clôturé ?
     * (hors autres règles : admin, responsable, etc., gérées dans la Policy.)
     */
    public function fournisseurPeutTelechargerPieceAoPubliee(User $user): bool
    {
        if ($user->role->name !== 'FOURNISSEUR' || !$this->appel_offre_id) {
            return false;
        }

        $this->loadMissing('appelOffre');
        $ao = $this->appelOffre;
        if (!$ao || !in_array($ao->statut, [AppelOffre::STATUS_PUBLISHED, AppelOffre::STATUS_CLOSED], true)) {
            return false;
        }

        if (in_array($this->categorie, self::appelOffrePiecesGratuitesFournisseur(), true)) {
            return true;
        }

        if ($this->categorie === 'CAHIER_DES_CHARGES') {
            if (!$ao->cahier_paiement_requis) {
                return true;
            }
            $prix = (int) ($ao->cahier_prix_xof ?? 0);
            if ($prix <= 0) {
                return true;
            }

            return CahierAccesAchat::query()
                ->where('user_id', $user->id)
                ->where('appel_offre_id', $ao->id)
                ->where('statut', CahierAccesAchat::STATUT_COMPLETED)
                ->exists();
        }

        return true;
    }
}