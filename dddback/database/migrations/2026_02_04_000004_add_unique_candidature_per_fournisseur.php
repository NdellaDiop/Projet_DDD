<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('candidatures', function (Blueprint $table) {
            $table->unique(['appel_offre_id', 'fournisseur_id'], 'candidatures_unique_per_fournisseur');
        });
    }

    public function down(): void
    {
        Schema::table('candidatures', function (Blueprint $table) {
            $table->dropUnique('candidatures_unique_per_fournisseur');
        });
    }
};