<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->string('attribution_statut')->default('non_attribue')->after('statut');
            $table->string('attributaire_nom')->nullable()->after('attribution_statut');
            $table->string('attributaire_ninea')->nullable()->after('attributaire_nom');
            $table->unsignedBigInteger('attribution_montant_xof')->nullable()->after('attributaire_ninea');
            $table->dateTime('attribution_date')->nullable()->after('attribution_montant_xof');
            $table->text('attribution_commentaire')->nullable()->after('attribution_date');
            $table->foreignId('attribution_par_user_id')->nullable()->constrained('users')->nullOnDelete()->after('attribution_commentaire');
        });
    }

    public function down(): void
    {
        Schema::table('appels_offres', function (Blueprint $table) {
            $table->dropConstrainedForeignId('attribution_par_user_id');
            $table->dropColumn([
                'attribution_statut',
                'attributaire_nom',
                'attributaire_ninea',
                'attribution_montant_xof',
                'attribution_date',
                'attribution_commentaire',
            ]);
        });
    }
};

