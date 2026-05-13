<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('appels_offres', 'reference')) {
            Schema::table('appels_offres', function (Blueprint $table) {
                $table->string('reference')->nullable()->after('titre');
            });
        }

        if (! Schema::hasColumn('appels_offres', 'source_financement')) {
            Schema::table('appels_offres', function (Blueprint $table) {
                $after = Schema::hasColumn('appels_offres', 'reference') ? 'reference' : 'titre';
                $table->string('source_financement', 50)->nullable()->after($after);
            });
        }

        DB::table('appels_offres')
            ->where(function ($q) {
                $q->whereNull('reference')->orWhere('reference', '=', '');
            })
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('appels_offres')
                        ->where('id', $row->id)
                        ->update(['reference' => 'LEGACY-AO-'.$row->id]);
                }
            });

        DB::table('appels_offres')
            ->whereNull('source_financement')
            ->update(['source_financement' => 'etat']);

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE appels_offres ALTER COLUMN reference SET NOT NULL');
            DB::statement('ALTER TABLE appels_offres ALTER COLUMN source_financement SET NOT NULL');
        } else {
            // MariaDB / MySQL : MODIFY COLUMN nécessite de respecifier le type.
            DB::statement('ALTER TABLE appels_offres MODIFY COLUMN reference VARCHAR(255) NOT NULL');
            DB::statement('ALTER TABLE appels_offres MODIFY COLUMN source_financement VARCHAR(50) NOT NULL');
        }

        // MariaDB 10.5+ et PostgreSQL acceptent tous deux `IF NOT EXISTS` sur CREATE INDEX.
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS appels_offres_reference_unique ON appels_offres (reference)');
    }

    public function down(): void
    {
        try {
            $driver = DB::connection()->getDriverName();
            if ($driver === 'pgsql') {
                DB::statement('DROP INDEX IF EXISTS appels_offres_reference_unique');
            } else {
                DB::statement('DROP INDEX IF EXISTS appels_offres_reference_unique ON appels_offres');
            }
        } catch (\Throwable $e) {
            // L'index peut ne pas exister
        }

        if (Schema::hasColumn('appels_offres', 'source_financement')) {
            Schema::table('appels_offres', function (Blueprint $table) {
                $table->dropColumn('source_financement');
            });
        }
    }
};
