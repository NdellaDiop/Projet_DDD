<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migre `candidatures.statut` de l'ENUM legacy ('soumise','en_evaluation',
 * 'acceptee','refusee') vers une colonne VARCHAR(50) acceptant les nouvelles
 * valeurs ('submitted','under_review','accepted','rejected').
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
            DB::statement("UPDATE candidatures SET statut = 'submitted' WHERE statut = 'soumise'");
            DB::statement("UPDATE candidatures SET statut = 'under_review' WHERE statut = 'en_evaluation'");
            DB::statement("UPDATE candidatures SET statut = 'accepted' WHERE statut = 'acceptee'");
            DB::statement("UPDATE candidatures SET statut = 'rejected' WHERE statut = 'refusee'");
            DB::statement("ALTER TABLE candidatures ALTER COLUMN statut TYPE varchar(50)");
            DB::statement("ALTER TABLE candidatures ALTER COLUMN statut SET DEFAULT 'submitted'");
        } else {
            DB::statement("ALTER TABLE candidatures MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'submitted'");
            DB::statement("UPDATE candidatures SET statut = 'submitted' WHERE statut = 'soumise'");
            DB::statement("UPDATE candidatures SET statut = 'under_review' WHERE statut = 'en_evaluation'");
            DB::statement("UPDATE candidatures SET statut = 'accepted' WHERE statut = 'acceptee'");
            DB::statement("UPDATE candidatures SET statut = 'rejected' WHERE statut = 'refusee'");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("UPDATE candidatures SET statut = 'soumise' WHERE statut = 'submitted'");
            DB::statement("UPDATE candidatures SET statut = 'en_evaluation' WHERE statut = 'under_review'");
            DB::statement("UPDATE candidatures SET statut = 'acceptee' WHERE statut = 'accepted'");
            DB::statement("UPDATE candidatures SET statut = 'refusee' WHERE statut = 'rejected'");
            DB::statement("ALTER TABLE candidatures ALTER COLUMN statut TYPE varchar(50)");
            DB::statement("ALTER TABLE candidatures ALTER COLUMN statut SET DEFAULT 'soumise'");
        } else {
            DB::statement("UPDATE candidatures SET statut = 'soumise' WHERE statut = 'submitted'");
            DB::statement("UPDATE candidatures SET statut = 'en_evaluation' WHERE statut = 'under_review'");
            DB::statement("UPDATE candidatures SET statut = 'acceptee' WHERE statut = 'accepted'");
            DB::statement("UPDATE candidatures SET statut = 'refusee' WHERE statut = 'rejected'");
            DB::statement("ALTER TABLE candidatures MODIFY COLUMN statut VARCHAR(50) NOT NULL DEFAULT 'soumise'");
        }
    }
};
