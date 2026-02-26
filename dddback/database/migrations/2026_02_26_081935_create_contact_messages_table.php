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
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('nom')->nullable(); // Nom de l'expéditeur (optionnel si authentifié)
            $table->string('email');
            $table->string('sujet');
            $table->text('message');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Si l'utilisateur est authentifié
            $table->enum('statut', ['nouveau', 'lu', 'repondu', 'archive'])->default('nouveau');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
    }
};
