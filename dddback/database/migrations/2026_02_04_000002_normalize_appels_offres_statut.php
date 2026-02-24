<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Convertir les anciennes valeurs
        DB::statement("UPDATE appels_offres SET statut = 'published' WHERE statut = 'ouvert'");
        DB::statement("UPDATE appels_offres SET statut = 'closed' WHERE statut = 'ferme'");
        DB::statement("UPDATE appels_offres SET statut = 'archived' WHERE statut = 'annule'");

        // Changer le type en string
        DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut TYPE varchar(50)");
        DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut SET DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Revenir aux anciennes valeurs si besoin
        DB::statement("UPDATE appels_offres SET statut = 'ouvert' WHERE statut = 'published'");
        DB::statement("UPDATE appels_offres SET statut = 'ferme' WHERE statut = 'closed'");
        DB::statement("UPDATE appels_offres SET statut = 'annule' WHERE statut = 'archived'");

        DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut TYPE varchar(50)");
        DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut SET DEFAULT 'ouvert'");
    }
};