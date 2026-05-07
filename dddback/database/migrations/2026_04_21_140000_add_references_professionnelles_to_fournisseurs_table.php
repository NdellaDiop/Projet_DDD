<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('fournisseurs', 'references_professionnelles')) {
            Schema::table('fournisseurs', function (Blueprint $table) {
                $table->text('references_professionnelles')->nullable()->after('quitus_fiscal');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('fournisseurs', 'references_professionnelles')) {
            Schema::table('fournisseurs', function (Blueprint $table) {
                $table->dropColumn('references_professionnelles');
            });
        }
    }
};
