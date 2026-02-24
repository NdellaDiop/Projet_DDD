<?php

namespace App\Http\Controllers;

use App\Models\LogActivite;

class AdminLogController extends Controller
{
    public function index()
    {
        return response()->json(
            LogActivite::with('user')->latest()->get()
        );
    }
}