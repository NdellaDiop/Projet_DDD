<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Rend `appels_offres.responsable_marche_id` nullable.
 *
 * Compatible PG et MariaDB/MySQL : la syntaxe de modification de colonne
 * et la gestion des contraintes étrangères diffèrent entre les deux moteurs.
 */
return new class extends Migration {
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres ALTER COLUMN responsable_marche_id DROP NOT NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        } else {
            // MariaDB / MySQL : drop FK, modifier la nullabilité, recréer la FK.
            // Le type doit correspondre exactement à celui de Laravel pour `foreignId()` (BIGINT UNSIGNED).
            DB::statement('ALTER TABLE appels_offres DROP FOREIGN KEY appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres MODIFY COLUMN responsable_marche_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appels_offres DROP CONSTRAINT IF EXISTS appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres ALTER COLUMN responsable_marche_id SET NOT NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        } else {
            DB::statement('ALTER TABLE appels_offres DROP FOREIGN KEY appels_offres_responsable_marche_id_foreign');
            DB::statement('ALTER TABLE appels_offres MODIFY COLUMN responsable_marche_id BIGINT UNSIGNED NOT NULL');
            DB::statement('ALTER TABLE appels_offres ADD CONSTRAINT appels_offres_responsable_marche_id_foreign FOREIGN KEY (responsable_marche_id) REFERENCES responsables_marche(id) ON DELETE CASCADE');
        }
    }
};
