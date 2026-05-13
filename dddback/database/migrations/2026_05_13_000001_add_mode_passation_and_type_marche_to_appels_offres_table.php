<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            if (! Schema::hasColumn('appels_offres', 'mode_passation')) {
                $table->string('mode_passation', 50)->nullable()->after('source_financement');
            }
            if (! Schema::hasColumn('appels_offres', 'type_marche')) {
                $table->string('type_marche', 50)->nullable()->after('mode_passation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            if (Schema::hasColumn('appels_offres', 'type_marche')) {
                $table->dropColumn('type_marche');
            }
            if (Schema::hasColumn('appels_offres', 'mode_passation')) {
                $table->dropColumn('mode_passation');
            }
        });
    }
};
