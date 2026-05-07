<?php

namespace App\Services\Ai;

use App\Models\Document;
use Illuminate\Support\Str;

class FournisseurFaqResponder
{
    /**
     * Retourne une réponse locale (sans IA) ou null si pas de match.
     *
     * @param array{
     *   fournisseur?: array{nom_entreprise?: string},
     *   documents_legaux_manquants?: array<int,string>,
     *   candidatures?: mixed
     * } $context
     */
    public function answer(string $message, array $context): ?string
    {
        $m = Str::lower(trim($message));
        if ($m === '') return null;

        // Salutations / small talk
        if (Str::contains($m, ['bonjour', 'bonsoir', 'salut', 'slt', 'hello', 'cc'])) {
            return "Bonjour. Je peux vous aider sur les **avis publiés**, vos **documents légaux**, ou le **suivi des démarches**. Que souhaitez-vous savoir ?";
        }

        // Documents légaux manquants
        if (Str::contains($m, ['documents', 'document', 'rccm', 'ninea', 'quitus', 'légal', 'legaux', 'légaux', 'manquant', 'manquants'])) {
            $missing = $context['documents_legaux_manquants'] ?? [];
            if (is_array($missing) && count($missing) > 0) {
                $map = Document::legalCategoryLabels();
                $labels = collect($missing)->map(fn ($cat) => $map[$cat] ?? (string) $cat)->values()->all();
                return "Il vous manque : " . implode(', ', $labels) . ".\n\nAllez dans **Documents légaux** (menu à gauche) pour les uploader.";
            }
            return "Vos documents légaux semblent complets.\n\nVous pouvez les vérifier dans **Documents légaux**.";
        }

        // Statuts de candidature
        if (Str::contains($m, ['statut', 'soumise', 'submitted', 'évaluation', 'evaluation', 'under_review', 'retenue', 'accepted', 'rejetée', 'rejetee', 'rejected'])) {
            return "Signification usuelle des statuts (historique / dossiers gérés par le service) :\n\n- **Soumise** : dossier enregistré côté système.\n- **En évaluation** : analyse par le service des marchés.\n- **Retenue** : suite à donner (souvent en présentiel, convocation, etc.).\n- **Rejetée** : non retenu.\n\nLe suivi est dans **Mes démarches**. La remise des plis se fait en règle générale **au siège** selon l’avis.";
        }

        // Cahier des charges : téléchargement et préparation de l’offre
        if (Str::contains($m, ['cahier', 'charge', 'charges', 'télécharger', 'telecharger', 'remplir', 'compléter', 'completer', 'exigence', 'exigences', 'répondre', 'repondre', 'formulaire', 'annexe', 'offre technique'])) {
            return "Après **paiement** du cahier (si le marché le prévoit) ou **gratuitement** si l’avis l’indique, **téléchargez** le fichier depuis la fiche du marché. C’est le support pour **préparer votre réponse** : complétez les **formulaires** ou tableaux prévus, joignez les **annexes** demandées, puis imprimez ou assemblez le dossier pour le **dépôt physique** des plis. Ce portail ne propose pas d’éditeur intégré : vous travaillez sur le document avec vos outils habituels (PDF, traitement de texte, etc.).";
        }

        // Soumission / dépôt des plis (physique)
        if (Str::contains($m, ['postuler', 'candidater', 'soumettre', 'soumission', 'envoyer une candidature', 'dépôt des plis', 'depot des plis', 'déposer', 'deposer'])) {
            return "Sur ce portail, on **consulte** l’avis et les pièces. La **soumission** (dépôt des plis) se fait en **présentiel** au lieu indiqué sur la fiche marché (section *Dépôt des plis*). Tenez à jour vos **documents légaux** dans votre espace pour faciliter l’accueil au guichet. Vous serez informé des suites (y compris par **notification** dans l’appli) si le service des marchés actualise votre dossier.";
        }

        // Modifier une candidature
        if (Str::contains($m, ['modifier', 'modification', 'changer', 'montant', 'mettre à jour', 'mise à jour', 'mettre a jour'])) {
            return "La modification en ligne d’un dossier n’est proposée que si une entrée existe déjà dans **Mes démarches** (contexte historique). Sinon, les mises à jour se font avec le service des marchés lors du **dépôt physique** ou sur instruction reçue par notification.";
        }

        // Délais / date limite
        if (Str::contains($m, ['date limite', 'deadline', 'délai', 'delai', 'clôture', 'cloture'])) {
            return "La **date limite** figure sur chaque avis. Préparez vos documents légaux dans l’espace fournisseur **avant** de vous rendre pour le dépôt des plis au siège.";
        }

        // Aide générale
        if (Str::contains($m, ['aide', 'help', 'que peux-tu faire', 'tu peux faire quoi', 'fonctionnalité'])) {
            return "Je peux vous expliquer :\n\n- Comment **consulter les avis** et **télécharger le cahier** (payant ou gratuit)\n- Comment **préparer votre réponse** sur la base du cahier avant le dépôt des plis\n- À quoi servent vos **documents légaux** avant une venue au siège\n- Les **notifications** et les **modalités de dépôt physique**\n\nExemple : « quels documents légaux me manquent ? »";
        }

        return null;
    }
}

