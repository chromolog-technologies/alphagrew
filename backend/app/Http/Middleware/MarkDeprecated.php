<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `deprecated:{successor}`: flags an endpoint kept only for older screens (RFC 9745
 * `Deprecation` header) and points to the endpoint that replaces it with a
 * `Link: <...>; rel="successor-version"` header. Behaviour is unchanged.
 *
 * Deprecated today: the company-as-drive API (/companies, /staff/placement/drives and
 * /applications), replaced by /placement/*; and the old marks table API (/student/marks,
 * /staff/marks/*), replaced by /mark-entries and /student/results.
 */
class MarkDeprecated
{
    public function handle(Request $request, Closure $next, string $successor): Response
    {
        $response = $next($request);

        $response->headers->set('Deprecation', 'true');
        $response->headers->set('Link', '<'.url('/api/v1/'.ltrim($successor, '/')).'>; rel="successor-version"');

        return $response;
    }
}
