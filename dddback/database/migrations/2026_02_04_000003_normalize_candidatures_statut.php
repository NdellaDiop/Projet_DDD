<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("UPDATE candidatures SET statut = 'submitted' WHERE statut = 'soumise'");
        DB::statement("UPDATE candidatures SET statut = 'under_review' WHERE statut = 'en_evaluation'");
        DB::statement("UPDATE candidatures SET statut = 'accepted' WHERE statut = 'acceptee'");
        DB::statement("UPDATE candidatures SET statut = 'rejected' WHERE statut = 'refusee'");

        DB::statement("ALTER TABLE candidatures ALTER COLUMN statut TYPE varchar(50)");
        DB::statement("ALTER TABLE candidatures ALTER COLUMN statut SET DEFAULT 'submitted'");
    }

    public function down(): void
    {
        DB::statement("UPDATE candidatures SET statut = 'soumise' WHERE statut = 'submitted'");
        DB::statement("UPDATE candidatures SET statut = 'en_evaluation' WHERE statut = 'under_review'");
        DB::statement("UPDATE candidatures SET statut = 'acceptee' WHERE statut = 'accepted'");
        DB::statement("UPDATE candidatures SET statut = 'refusee' WHERE statut = 'rejected'");

        DB::statement("ALTER TABLE candidatures ALTER COLUMN statut TYPE varchar(50)");
        DB::statement("ALTER TABLE candidatures ALTER COLUMN statut SET DEFAULT 'soumise'");
    }
};