<?php

/*
 * Cross-origin access for the React app when it is served from another origin (for example
 * the frontend on Vercel and the API elsewhere). Authentication is a bearer token, never a
 * cookie, so credentials stay off.
 *
 * CORS_ALLOWED_ORIGINS: comma-separated origins. Defaults to FRONTEND_URL. Locally the Vite
 * dev server proxies /api, so requests are same-origin and this does not apply.
 */
$origins = array_values(array_filter(array_map(
    fn (string $origin): string => rtrim(trim($origin), '/'),
    explode(',', (string) (env('CORS_ALLOWED_ORIGINS') ?: env('FRONTEND_URL', 'http://localhost:5173'))),
)));

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    // Read by the frontend: export file names, sample-data marking, deprecation notices.
    'exposed_headers' => ['Content-Disposition', 'X-Data-Source', 'Deprecation', 'Link', 'Retry-After'],

    'max_age' => 3600,

    'supports_credentials' => false,

];
