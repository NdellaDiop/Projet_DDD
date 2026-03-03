<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('fournisseurs', function (Blueprint $table) {
            $table->string('statut')->default('en_attente')->after('user_id'); // en_attente, actif, rejete
        });

        // Mise à jour des données existantes
        // On récupère tous les fournisseurs avec leur utilisateur
        $fournisseurs = DB::table('fournisseurs')
            ->join('users', 'fournisseurs.user_id', '=', 'users.id')
            ->select('fournisseurs.id', 'users.is_active')
            ->get();

        foreach ($fournisseurs as $fournisseur) {
            $newStatut = $fournisseur->is_active ? 'actif' : 'en_attente';
            DB::table('fournisseurs')
                ->where('id', $fournisseur->id)
                ->update(['statut' => $newStatut]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('fournisseurs', function (Blueprint $table) {
            $table->dropColumn('statut');
        });
    }
};
