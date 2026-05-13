<?php

namespace App\Http\Controllers;

use App\Models\Candidature;
use App\Models\Document;
use App\Services\Ai\AiChatService;
use App\Services\Ai\FournisseurFaqResponder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FournisseurChatController extends Controller
{
    public function __construct(
        private readonly AiChatService $ai,
        private readonly FournisseurFaqResponder $faq,
    )
    {
        $this->middleware(['auth:sanctum', 'role:FOURNISSEUR']);
    }

    public function chat(Request $request)
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
            'history' => 'nullable|array|max:20',
            'history.*.role' => 'required_with:history|string|in:user,assistant',
            'history.*.content' => 'required_with:history|string|max:2000',
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        $message = trim((string) $validated['message']);

        if (AiChatService::isOutOfScope($message)) {
            return response()->json([
                'answer' => "Je ne peux pas aider sur les mots de passe, tokens, clés API ou informations sensibles. Je peux par contre vous aider sur vos démarches, documents légaux, statuts et étapes (avis, cahier des charges, dépôt des plis).",
                'safety_flags' => ['out_of_scope' => true],
            ]);
        }

        $start = microtime(true);

        // Context: candidatures + documents légaux manquants
        $fournisseur = $user->fournisseur;
        if (!$fournisseur) {
            return response()->json(['message' => 'Utilisateur non reconnu comme fournisseur.'], 403);
        }

        $candidatures = Candidature::query()
            ->where('fournisseur_id', $fournisseur->id)
            ->with(['appelOffre:id,titre,reference,date_limite_depot,statut'])
            ->latest('created_at')
            ->limit(25)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'statut' => $c->statut,
                'date_soumission' => optional($c->date_soumission)->toIso8601String(),
                'montant_propose' => $c->montant_propose,
                'appel_offre' => [
                    'id' => $c->appelOffre?->id,
                    'titre' => $c->appelOffre?->titre,
                    'reference' => $c->appelOffre?->reference,
                    'statut' => $c->appelOffre?->statut,
                    'date_limite_depot' => $c->appelOffre?->date_limite_depot,
                ],
            ])->values();

        $legalCategories = \App\Models\Document::LEGAL_CATEGORIES;
        $legalDocs = Document::query()
            ->where('user_id', $user->id)
            ->whereIn('categorie', \App\Models\Document::allLegalUploadCategories())
            ->select(['id', 'categorie', 'nom_fichier', 'created_at'])
            ->latest()
            ->get()
            ->groupBy('categorie')
            ->map(fn ($items) => $items->take(3)->map(fn ($d) => [
                'id' => $d->id,
                'nom_fichier' => $d->nom_fichier,
                'created_at' => optional($d->created_at)->toIso8601String(),
            ])->values())
            ->toArray();

        $missingLegal = collect($legalCategories)->filter(fn ($cat) => empty($legalDocs[$cat]) || count($legalDocs[$cat]) === 0)->values()->all();

        $context = [
            'role' => 'FOURNISSEUR',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'fournisseur' => [
                'id' => $fournisseur->id,
                'nom_entreprise' => $fournisseur->nom_entreprise,
            ],
            'candidatures' => $candidatures,
            'documents_legaux' => $legalDocs,
            'documents_legaux_manquants' => $missingLegal,
        ];

        // 1) Réponse locale (FAQ) pour les questions basiques → 0 coût
        $faqAnswer = $this->faq->answer($message, $context);
        if (is_string($faqAnswer) && trim($faqAnswer) !== '') {
            $elapsedMs = (int) round((microtime(true) - $start) * 1000);
            Log::info('fournisseur_chat', [
                'user_id' => $user->id,
                'elapsed_ms' => $elapsedMs,
                'provider' => 'faq',
                'model' => null,
                'message_chars' => mb_strlen($message),
            ]);
            return response()->json([
                'answer' => $faqAnswer,
                'meta' => [
                    'provider' => 'faq',
                    'model' => null,
                    'elapsed_ms' => $elapsedMs,
                ],
            ]);
        }

        $system = <<<PROMPT
Tu es un assistant du portail des appels d'offres de Dakar Dem Dikk, dédié aux fournisseurs.
Règles:
- Réponds en français, de façon claire et actionnable.
- Utilise uniquement le CONTEXTE fourni et des règles générales du portail (statuts, documents, étapes).
- Ne demande jamais de mots de passe / tokens / informations sensibles. Si on te les demande, refuse et redirige.
- Si la question est ambiguë, pose 1 question de clarification courte.
- Quand tu cites un statut/document, explique ce que l'utilisateur peut faire dans l'interface.

CONTEXTE (JSON):
{$this->safeJson($context)}
PROMPT;

        $messages = [
            ['role' => 'system', 'content' => $system],
        ];

        // Optional history (keep short, backend re-checks size)
        $history = $validated['history'] ?? [];
        foreach ($history as $h) {
            $messages[] = [
                'role' => $h['role'],
                'content' => $h['content'],
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        $res = $this->ai->chat($messages);

        $elapsedMs = (int) round((microtime(true) - $start) * 1000);
        Log::info('fournisseur_chat', [
            'user_id' => $user->id,
            'elapsed_ms' => $elapsedMs,
            'provider' => $res['provider'] ?? null,
            'model' => $res['model'] ?? null,
            'message_chars' => mb_strlen($message),
        ]);

        return response()->json([
            'answer' => $res['answer'],
            'meta' => [
                'provider' => $res['provider'] ?? null,
                'model' => $res['model'] ?? null,
                'elapsed_ms' => $elapsedMs,
            ],
        ]);
    }

    private function safeJson(array $value): string
    {
        return (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

