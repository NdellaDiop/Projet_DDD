<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->boolean('cahier_paiement_requis')->default(false)->after('statut');
            $table->unsignedInteger('cahier_prix_xof')->nullable()->after('cahier_paiement_requis');
        });
    }

    public function down(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->dropColumn(['cahier_paiement_requis', 'cahier_prix_xof']);
        });
    }
};
