<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('fournisseurs', function (Blueprint $table) {
            $table->string('ninea')->nullable()->after('email_contact');
            $table->string('rccm')->nullable()->after('ninea');
            $table->string('quitus_fiscal')->nullable()->after('rccm');
        });
    }

    public function down(): void
    {
        Schema::table('fournisseurs', function (Blueprint $table) {
            $table->dropColumn(['ninea', 'rccm', 'quitus_fiscal']);
        });
    }
};