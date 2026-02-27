# 🚀 Guide d'Implémentation : Assistant IA pour Rédaction d'Appels d'Offres

## 📋 Vue d'ensemble

Cet assistant aidera les responsables à rédiger des appels d'offres plus rapidement et avec une meilleure qualité en utilisant l'IA pour générer des descriptions, suggérer des clauses et vérifier la complétude.

---

## 🔧 Étape 1 : Installation des Dépendances

### Backend (Laravel)

```bash
cd dddback
composer require openai-php/laravel
```

### Frontend (React)

```bash
cd dddfront
npm install openai
```

---

## 🔑 Étape 2 : Configuration

### Backend - Variables d'environnement

Ajouter dans `.env` :
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
```

### Backend - Configuration Laravel

Créer `config/openai.php` :
```php
<?php

return [
    'api_key' => env('OPENAI_API_KEY'),
    'model' => env('OPENAI_MODEL', 'gpt-4-turbo-preview'),
    'max_tokens' => env('OPENAI_MAX_TOKENS', 2000),
    'temperature' => env('OPENAI_TEMPERATURE', 0.7),
];
```

---

## 💻 Étape 3 : Création du Service Backend

### Créer `app/Services/AIAssistantService.php`

```php
<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;
use App\Models\AppelOffre;

class AIAssistantService
{
    /**
     * Génère une description d'appel d'offre à partir d'un titre
     */
    public function generateDescription(string $titre, ?string $contexte = null): string
    {
        $prompt = "Tu es un expert en rédaction d'appels d'offres publics au Sénégal. 
        Génère une description professionnelle et complète pour un appel d'offres avec le titre suivant : 
        \"{$titre}\"
        
        " . ($contexte ? "Contexte supplémentaire : {$contexte}" : "") . "
        
        La description doit :
        - Être claire et professionnelle
        - Respecter les normes des appels d'offres publics
        - Inclure les éléments essentiels (objectif, périmètre, livrables attendus)
        - Faire entre 200 et 400 mots
        - Être en français
        
        Génère uniquement la description, sans introduction ni conclusion.";

        $response = OpenAI::chat()->create([
            'model' => config('openai.model'),
            'messages' => [
                ['role' => 'system', 'content' => 'Tu es un assistant expert en rédaction d\'appels d\'offres publics.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => config('openai.max_tokens'),
            'temperature' => config('openai.temperature'),
        ]);

        return trim($response->choices[0]->message->content);
    }

    /**
     * Suggère des clauses importantes pour un type d'appel d'offre
     */
    public function suggestClauses(string $type, ?string $description = null): array
    {
        $prompt = "Pour un appel d'offres de type \"{$type}\"" . 
                 ($description ? " avec la description suivante : {$description}" : "") . "
        
        Liste 5 à 7 clauses importantes qui devraient être incluses dans cet appel d'offres.
        Chaque clause doit être :
        - Pertinente pour ce type d'appel d'offres
        - Conforme aux normes sénégalaises
        - Formulée de manière professionnelle
        
        Réponds au format JSON avec un tableau de clauses :
        [\"Clause 1\", \"Clause 2\", ...]";

        $response = OpenAI::chat()->create([
            'model' => config('openai.model'),
            'messages' => [
                ['role' => 'system', 'content' => 'Tu es un expert en droit des marchés publics au Sénégal.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 1000,
            'temperature' => 0.5,
        ]);

        $content = json_decode($response->choices[0]->message->content, true);
        return $content['clauses'] ?? [];
    }

    /**
     * Vérifie la complétude d'un appel d'offre
     */
    public function checkCompleteness(AppelOffre $appelOffre): array
    {
        $prompt = "Analyse cet appel d'offres et identifie les éléments manquants ou à améliorer :
        
        Titre : {$appelOffre->titre}
        Description : {$appelOffre->description}
        Date limite : {$appelOffre->date_limite_depot}
        
        Vérifie la présence de :
        - Description claire et complète
        - Dates cohérentes
        - Informations sur les critères d'évaluation
        - Informations sur les documents requis
        - Informations sur les conditions de participation
        
        Réponds au format JSON :
        {
            \"score\": 0-100,
            \"missing_elements\": [\"élément 1\", \"élément 2\"],
            \"suggestions\": [\"suggestion 1\", \"suggestion 2\"],
            \"is_complete\": true/false
        }";

        $response = OpenAI::chat()->create([
            'model' => config('openai.model'),
            'messages' => [
                ['role' => 'system', 'content' => 'Tu es un expert en validation d\'appels d\'offres publics.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 1000,
            'temperature' => 0.3,
        ]);

        return json_decode($response->choices[0]->message->content, true);
    }

    /**
     * Corrige la grammaire et l'orthographe d'un texte
     */
    public function correctGrammar(string $texte): string
    {
        $prompt = "Corrige la grammaire, l'orthographe et le style de ce texte d'appel d'offres. 
        Garde le sens et le ton professionnel. Réponds uniquement avec le texte corrigé :
        
        {$texte}";

        $response = OpenAI::chat()->create([
            'model' => config('openai.model'),
            'messages' => [
                ['role' => 'system', 'content' => 'Tu es un correcteur professionnel spécialisé en rédaction administrative.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => 2000,
            'temperature' => 0.2,
        ]);

        return trim($response->choices[0]->message->content);
    }
}
```

---

## 🎯 Étape 4 : Création du Contrôleur API

### Créer `app/Http/Controllers/AIAssistantController.php`

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\AIAssistantService;
use App\Models\AppelOffre;
use Illuminate\Support\Facades\Auth;

class AIAssistantController extends Controller
{
    protected $aiService;

    public function __construct(AIAssistantService $aiService)
    {
        $this->middleware(['auth:sanctum', 'role:RESPONSABLE_MARCHE,ADMIN']);
        $this->aiService = $aiService;
    }

    /**
     * Génère une description d'AO
     */
    public function generateDescription(Request $request)
    {
        $request->validate([
            'titre' => 'required|string|max:255',
            'contexte' => 'nullable|string|max:1000',
        ]);

        try {
            $description = $this->aiService->generateDescription(
                $request->titre,
                $request->contexte
            );

            return response()->json([
                'success' => true,
                'description' => $description,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Suggère des clauses
     */
    public function suggestClauses(Request $request)
    {
        $request->validate([
            'type' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        try {
            $clauses = $this->aiService->suggestClauses(
                $request->type,
                $request->description
            );

            return response()->json([
                'success' => true,
                'clauses' => $clauses,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération des clauses : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Vérifie la complétude d'un AO
     */
    public function checkCompleteness(AppelOffre $appelOffre)
    {
        try {
            $result = $this->aiService->checkCompleteness($appelOffre);

            return response()->json([
                'success' => true,
                'analysis' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'analyse : ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Corrige la grammaire
     */
    public function correctGrammar(Request $request)
    {
        $request->validate([
            'texte' => 'required|string',
        ]);

        try {
            $corrected = $this->aiService->correctGrammar($request->texte);

            return response()->json([
                'success' => true,
                'corrected_text' => $corrected,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la correction : ' . $e->getMessage(),
            ], 500);
        }
    }
}
```

---

## 🛣 Étape 5 : Ajout des Routes API

Dans `routes/api.php`, ajouter :

```php
// Dans le groupe middleware 'role:RESPONSABLE_MARCHE,ADMIN'
Route::prefix('ai-assistant')->group(function () {
    Route::post('generate-description', [AIAssistantController::class, 'generateDescription']);
    Route::post('suggest-clauses', [AIAssistantController::class, 'suggestClauses']);
    Route::get('appels-offres/{appel_offre}/check-completeness', [AIAssistantController::class, 'checkCompleteness']);
    Route::post('correct-grammar', [AIAssistantController::class, 'correctGrammar']);
});
```

---

## ⚛️ Étape 6 : Composant React Frontend

### Créer `dddfront/src/components/ai/AIAssistant.tsx`

```tsx
import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantProps {
  onDescriptionGenerated?: (description: string) => void;
  currentTitre?: string;
  currentDescription?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  onDescriptionGenerated,
  currentTitre = '',
  currentDescription = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [suggestedClauses, setSuggestedClauses] = useState<string[]>([]);
  const [contexte, setContexte] = useState('');
  const { toast } = useToast();
  const api = (window as any).api; // Utiliser votre instance axios

  const handleGenerateDescription = async () => {
    if (!currentTitre.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez d'abord saisir un titre",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/ai-assistant/generate-description', {
        titre: currentTitre,
        contexte: contexte || null,
      });

      if (response.data.success) {
        setGeneratedDescription(response.data.description);
        if (onDescriptionGenerated) {
          onDescriptionGenerated(response.data.description);
        }
        toast({
          title: "Description générée",
          description: "La description a été générée avec succès",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la génération",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClauses = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/ai-assistant/suggest-clauses', {
        type: currentTitre || 'Appel d\'offres général',
        description: currentDescription || '',
      });

      if (response.data.success) {
        setSuggestedClauses(response.data.clauses);
        toast({
          title: "Clauses suggérées",
          description: `${response.data.clauses.length} clauses ont été générées`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la génération",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectGrammar = async () => {
    if (!currentDescription.trim()) {
      toast({
        title: "Erreur",
        description: "Aucun texte à corriger",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/ai-assistant/correct-grammar', {
        texte: currentDescription,
      });

      if (response.data.success) {
        if (onDescriptionGenerated) {
          onDescriptionGenerated(response.data.corrected_text);
        }
        toast({
          title: "Texte corrigé",
          description: "La grammaire a été corrigée",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.message || "Erreur lors de la correction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Assistant IA
        </CardTitle>
        <CardDescription>
          Utilisez l'IA pour améliorer votre appel d'offres
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Génération de description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Contexte supplémentaire (optionnel)</label>
          </div>
          <Textarea
            placeholder="Ajoutez des informations supplémentaires pour améliorer la génération..."
            value={contexte}
            onChange={(e) => setContexte(e.target.value)}
            rows={2}
          />
          <Button
            onClick={handleGenerateDescription}
            disabled={loading || !currentTitre.trim()}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer la description avec l'IA
              </>
            )}
          </Button>
        </div>

        {/* Description générée */}
        {generatedDescription && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Description générée :</label>
            <div className="p-3 bg-muted rounded-md border">
              <p className="text-sm whitespace-pre-wrap">{generatedDescription}</p>
            </div>
            <Button
              onClick={() => {
                if (onDescriptionGenerated) {
                  onDescriptionGenerated(generatedDescription);
                }
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Utiliser cette description
            </Button>
          </div>
        )}

        {/* Suggestions de clauses */}
        <div className="space-y-2">
          <Button
            onClick={handleSuggestClauses}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Suggérer des clauses importantes
              </>
            )}
          </Button>
        </div>

        {/* Clauses suggérées */}
        {suggestedClauses.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Clauses suggérées :</label>
            <div className="space-y-1">
              {suggestedClauses.map((clause, index) => (
                <Badge key={index} variant="secondary" className="block p-2 text-left">
                  {clause}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Correction grammaticale */}
        {currentDescription && (
          <Button
            onClick={handleCorrectGrammar}
            disabled={loading || !currentDescription.trim()}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Correction en cours...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Corriger la grammaire et l'orthographe
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## 🎨 Étape 7 : Intégration dans le Formulaire de Création d'AO

Dans `ResponsableDashboard.tsx` ou `AdminDashboard.tsx`, dans le modal de création d'AO :

```tsx
import { AIAssistant } from '@/components/ai/AIAssistant';

// Dans le formulaire de création d'AO
<AIAssistant
  currentTitre={newTender.titre}
  currentDescription={newTender.description}
  onDescriptionGenerated={(description) => {
    setNewTender({ ...newTender, description });
  }}
/>
```

---

## 🧪 Étape 8 : Test

1. **Tester la génération de description** :
   - Saisir un titre
   - Cliquer sur "Générer la description avec l'IA"
   - Vérifier que la description est générée

2. **Tester les suggestions de clauses** :
   - Cliquer sur "Suggérer des clauses importantes"
   - Vérifier que les clauses sont affichées

3. **Tester la correction grammaticale** :
   - Saisir un texte avec des fautes
   - Cliquer sur "Corriger la grammaire"
   - Vérifier que le texte est corrigé

---

## 💰 Coût Estimé

- **OpenAI GPT-4 Turbo** : ~$0.01-0.03 par requête
- **Pour 1000 appels d'offres/mois** : ~$10-30/mois

---

## 🎯 Prochaines Étapes

1. Ajouter un système de cache pour éviter les appels répétés
2. Implémenter un système de feedback pour améliorer les prompts
3. Ajouter des templates de prompts pour différents types d'AO
4. Intégrer la vérification de complétude dans le workflow de publication

---

## 📝 Notes Importantes

- **Sécurité** : Ne jamais exposer la clé API côté frontend
- **Rate Limiting** : Implémenter un rate limiting pour éviter les abus
- **Erreurs** : Gérer gracieusement les erreurs API
- **Fallback** : Prévoir un fallback si l'API est indisponible
