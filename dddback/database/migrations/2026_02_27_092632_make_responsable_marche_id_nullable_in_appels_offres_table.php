<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Pour PostgreSQL, on doit d'abord supprimer la contrainte, modifier la colonne, puis recréer la contrainte
        DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
        DB::statement('ALTER TABLE appels_offres ALTER COLUMN responsable_marche_id DROP NOT NULL');
        DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remettre la contrainte NOT NULL (attention: cela peut échouer si des valeurs NULL existent)
        DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
        DB::statement('ALTER TABLE appels_offres ALTER COLUMN responsable_marche_id SET NOT NULL');
        DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
    }
};
