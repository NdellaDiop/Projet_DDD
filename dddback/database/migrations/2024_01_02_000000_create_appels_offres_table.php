<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appels_offres', function (Blueprint $table) {
            $table->id();
            $table->foreignId('responsable_marche_id')->constrained('responsables_marche')->onDelete('cascade');
            $table->string('titre');
            $table->text('description')->nullable();
            $table->dateTime('date_publication');
            $table->dateTime('date_limite_depot');
            $table->enum('statut', ['ouvert', 'ferme', 'annule'])->default('ouvert');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appels_offres');
    }
};