<?php

namespace Tests\Unit;

use App\Support\Csv;
use PHPUnit\Framework\TestCase;

class CsvTest extends TestCase
{
    public function test_cells_that_spreadsheets_would_run_as_formulas_become_text(): void
    {
        foreach (['=HYPERLINK("http://evil.example","Click")', '+1+1', '-2+3', '@SUM(A1)', "\t=1+1", "\r=1+1"] as $value) {
            $this->assertSame("'{$value}", Csv::cell($value), $value);
        }
    }

    public function test_ordinary_values_are_unchanged(): void
    {
        $this->assertSame(['St. Teresa College', '42', '', 'a=b'], Csv::row(['St. Teresa College', 42, null, 'a=b']));
    }
}
