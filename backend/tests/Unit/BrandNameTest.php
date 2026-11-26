<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * The product name is written "AlphaGrew" everywhere (decided 17 November 2026); emails, the
 * platform name and seeded content included. URLs and handles use lowercase "alphagrew".
 */
class BrandNameTest extends TestCase
{
    public function test_the_brand_is_spelled_alphagrew_in_backend_code(): void
    {
        $base = dirname(__DIR__, 2);
        $offenders = [];

        foreach (['app', 'config', 'database', 'resources', 'routes'] as $folder) {
            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator("{$base}/{$folder}", RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($files as $file) {
                if ($file->getExtension() === 'php' && preg_match('/Alphagrew|Alpha Grew|ALPHA GREW|ALPHAGREW|Alpha-Grew/', (string) file_get_contents($file->getPathname()))) {
                    $offenders[] = substr($file->getPathname(), strlen($base) + 1);
                }
            }
        }

        $this->assertSame([], $offenders);
    }

    public function test_the_application_name_defaults_to_alphagrew(): void
    {
        $config = (string) file_get_contents(dirname(__DIR__, 2).'/config/app.php');

        $this->assertStringContainsString("env('APP_NAME', 'AlphaGrew')", $config);
    }
}
