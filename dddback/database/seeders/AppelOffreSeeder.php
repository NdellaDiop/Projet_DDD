<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AppelOffre;
use App\Models\ResponsableMarche; // Assurez-vous d'importer le modèle ResponsableMarche
use Carbon\Carbon; // Pour manipuler les dates

class AppelOffreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Vérifier s'il y a au moins un ResponsableMarche
        $responsableMarche = ResponsableMarche::first();

        // Si aucun ResponsableMarche n'existe, vous devriez en créer un via UserSeeder ou ici si nécessaire
        // Pour l'instant, si ResponsableMarche::first() retourne null, cela signifie qu'il n'y a pas de responsable
        // et vous devriez vous assurer que UserSeeder crée bien un utilisateur de type RESPONSABLE_MARCHE.
        if (!$responsableMarche) {
            echo "Attention: Aucun ResponsableMarche trouvé. Veuillez vous assurer que le UserSeeder crée un ResponsableMarche.\n";
            return; // Ne pas créer d'appels d'offres sans responsable
        }

        // Création d'appels d'offres
        AppelOffre::create([
            'responsable_marche_id' => $responsableMarche->id,
            'titre' => 'Fourniture de matériel informatique',
            'description' => 'Appel d\'offres pour la fourniture de 50 ordinateurs portables et 20 imprimantes multifonctions pour les bureaux de Dakar Dem Dikk.',
            'date_publication' => Carbon::now()->subDays(10), // Publié il y a 10 jours
            'date_limite_depot' => Carbon::now()->addDays(20), // Date limite dans 20 jours
            'statut' => 'ouvert',
        ]);

        AppelOffre::create([
            'responsable_marche_id' => $responsableMarche->id,
            'titre' => 'Services de nettoyage pour les agences régionales',
            'description' => 'Contrat de prestation de services de nettoyage et d\'entretien pour les 5 agences régionales de Dakar Dem Dikk.',
            'date_publication' => Carbon::now()->subDays(5),
            'date_limite_depot' => Carbon::now()->addDays(15),
            'statut' => 'ouvert',
        ]);

        AppelOffre::create([
            'responsable_marche_id' => $responsableMarche->id,
            'titre' => 'Réhabilitation de la gare routière principale',
            'description' => 'Travaux de rénovation et d\'agrandissement de la gare routière principale, incluant les infrastructures et les commerces.',
            'date_publication' => Carbon::now()->subDays(20),
            'date_limite_depot' => Carbon::now()->subDays(5), // Date limite passée
            'statut' => 'ferme',
        ]);

        echo "Appels d'offres semés avec succès.\n";
    }
}