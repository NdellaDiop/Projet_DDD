<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::where('name', 'ADMIN')->first();

        User::create([
            'name' => 'Admin DemDikk',
            'email' => 'admin@dakardemdikk.com',
            'password' => Hash::make('Demdikk2026'), 
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        // Vous pouvez ajouter d'autres utilisateurs par défaut ici si nécessaire
    }
}