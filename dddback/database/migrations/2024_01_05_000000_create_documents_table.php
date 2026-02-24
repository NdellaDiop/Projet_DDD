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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null'); // Document uploader
            $table->foreignId('candidature_id')->nullable()->constrained('candidatures')->onDelete('cascade');
            $table->foreignId('appel_offre_id')->nullable()->constrained('appels_offres')->onDelete('cascade');
            $table->string('nom_fichier');
            $table->string('type_fichier')->nullable();
            $table->string('chemin_fichier');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};