<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Supprimer un PRM ne doit PAS supprimer ses appels d'offres :
     * on détache seulement l'assignation (responsable_marche_id = null).
     */
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres ALTER COLUMN responsable_marche_id DROP NOT NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE SET NULL');
        } else {
            DB::statement('ALTER TABLE appels_offres DROP FOREIGN KEY appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres MODIFY COLUMN responsable_marche_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE SET NULL');
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        } else {
            DB::statement('ALTER TABLE appels_offres DROP FOREIGN KEY appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        }
    }
};
