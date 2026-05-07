<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cahier_acces_achats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appel_offre_id')->constrained('appels_offres')->cascadeOnDelete();
            $table->unsignedInteger('montant_xof');
            $table->string('provider', 32); // wave | orange_money
            $table->string('statut', 24)->default('pending'); // pending | completed | failed | cancelled
            $table->string('reference_externe')->nullable()->index();
            $table->timestamp('paye_le')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'appel_offre_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cahier_acces_achats');
    }
};
