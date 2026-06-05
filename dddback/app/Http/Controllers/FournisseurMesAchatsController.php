<?php

namespace App\Http\Controllers;

use App\Models\CahierAccesAchat;
use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FournisseurMesAchatsController extends Controller
{
    private const PROVIDER_LABELS = [
        CahierAccesAchat::PROVIDER_WAVE => 'Wave',
        CahierAccesAchat::PROVIDER_ORANGE_MONEY => 'Orange Money',
        CahierAccesAchat::PROVIDER_SIMULATION => 'Simulation (démo)',
    ];

    /**
     * Historique des achats de cahier des charges (style « Mes commandes » / Odoo).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isFournisseur()) {
            return response()->json(['message' => 'Réservé aux fournisseurs.'], 403);
        }

        $achats = CahierAccesAchat::query()
            ->where('user_id', $user->id)
            ->where('statut', CahierAccesAchat::STATUT_COMPLETED)
            ->with(['appelOffre.documents'])
            ->orderByDesc('paye_le')
            ->orderByDesc('created_at')
            ->get();

        $data = $achats->map(fn (CahierAccesAchat $achat) => $this->formatAchat($achat))->values();

        return response()->json(['data' => $data]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAchat(CahierAccesAchat $achat): array
    {
        $ao = $achat->appelOffre;
        $cahierDoc = $ao?->documents
            ?->firstWhere('categorie', 'CAHIER_DES_CHARGES');

        $cahierDocument = null;
        if ($cahierDoc instanceof Document) {
            $cahierDocument = [
                'id' => $cahierDoc->id,
                'nom_fichier' => $cahierDoc->nom_fichier,
                'download_url' => '/api/documents/'.$cahierDoc->id.'/download',
            ];
        }

        return [
            'id' => $achat->id,
            'montant_xof' => (int) $achat->montant_xof,
            'provider' => $achat->provider,
            'provider_label' => self::PROVIDER_LABELS[$achat->provider] ?? $achat->provider,
            'statut' => $achat->statut,
            'reference_externe' => $achat->reference_externe,
            'paye_le' => $achat->paye_le?->toIso8601String(),
            'created_at' => $achat->created_at?->toIso8601String(),
            'appel_offre' => $ao ? [
                'id' => $ao->id,
                'titre' => $ao->titre,
                'reference' => $ao->reference,
                'statut' => $ao->statut,
            ] : null,
            'cahier_document' => $cahierDocument,
            'libelle' => 'Cahier des charges',
        ];
    }
}
