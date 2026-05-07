<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Instructions pour le dépôt physique des plis (soumission).
     */
    public function up(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->text('modalites_soumission_physique')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->dropColumn('modalites_soumission_physique');
        });
    }
};
