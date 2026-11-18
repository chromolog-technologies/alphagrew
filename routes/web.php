<?php

use Illuminate\Support\Facades\Route;

// The API's home URL. The web app is a separate site; this only confirms the API is up
// (the health check for monitors is /up).
Route::get('/', fn () => response()->json([
    'name' => config('app.name').' API',
    'status' => 'ok',
]));
