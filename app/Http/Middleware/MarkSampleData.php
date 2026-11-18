<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Flags responses from controllers that still return hardcoded sample data
 * instead of reading real tables. Remove from a route group once its
 * controller is connected to the database.
 */
class MarkSampleData
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('X-Data-Source', 'sample');

        return $response;
    }
}
