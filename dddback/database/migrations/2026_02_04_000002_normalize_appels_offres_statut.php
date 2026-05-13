<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migre `appels_offres.statut` de l'ENUM legacy ('ouvert','ferme','annule')
 * vers une colonne VARCHAR(50) qui accepte les nouvelles valeurs
 * ('draft','published','closed','archived').
 *
 * Compatible PostgreSQL ET MariaDB/MySQL :
 *  - PG : on peut UPDATE puis ALTER COLUMN TYPE varchar.
 *  - MariaDB : il faut MODIFY le type AVANT de migrer les valeurs,
 *    sinon les UPDATE échouent (ENUM strict).
 */
return new class extends Migration {
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("UPDATE appels_offres SET statut = 'published' WHERE statut = 'ouvert'");
            DB::statement("UPDATE appels_offres SET statut = 'closed' WHERE statut = 'ferme'");
            DB::statement("UPDATE appels_offres SET statut = 'archived' WHERE statut = 'annule'");
            DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut TYPE varchar(50)");
            DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut SET DEFAULT 'draft'");
        } else {
            // MariaDB / MySQL : d'abord élargir le type, ensuite migrer les valeurs.
            DB::statement("ALTER TABLE appels_offres MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'draft'");
            DB::statement("UPDATE appels_offres SET statut = 'published' WHERE statut = 'ouvert'");
            DB::statement("UPDATE appels_offres SET statut = 'closed' WHERE statut = 'ferme'");
            DB::statement("UPDATE appels_offres SET statut = 'archived' WHERE statut = 'annule'");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("UPDATE appels_offres SET statut = 'ouvert' WHERE statut = 'published'");
            DB::statement("UPDATE appels_offres SET statut = 'ferme' WHERE statut = 'closed'");
            DB::statement("UPDATE appels_offres SET statut = 'annule' WHERE statut = 'archived'");
            DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut TYPE varchar(50)");
            DB::statement("ALTER TABLE appels_offres ALTER COLUMN statut SET DEFAULT 'ouvert'");
        } else {
            DB::statement("UPDATE appels_offres SET statut = 'ouvert' WHERE statut = 'published'");
            DB::statement("UPDATE appels_offres SET statut = 'ferme' WHERE statut = 'closed'");
            DB::statement("UPDATE appels_offres SET statut = 'annule' WHERE statut = 'archived'");
            DB::statement("ALTER TABLE appels_offres MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'ouvert'");
        }
    }
};
