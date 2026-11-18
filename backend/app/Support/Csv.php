<?php

namespace App\Support;

/**
 * Spreadsheet-safe CSV cells. Excel, Sheets and LibreOffice treat a cell that starts with
 * = + - @ (or a tab or carriage return before one) as a formula, so text a user typed, such as
 * an institution or student name, could run as one when staff open an export. Such cells get
 * a leading apostrophe, which spreadsheets show as plain text.
 */
final class Csv
{
    private const FORMULA_STARTS = ['=', '+', '-', '@', "\t", "\r"];

    public static function cell(mixed $value): string
    {
        $text = (string) ($value ?? '');

        return $text !== '' && in_array($text[0], self::FORMULA_STARTS, true) ? "'{$text}" : $text;
    }

    /** @param  iterable<mixed>  $values  @return list<string> */
    public static function row(iterable $values): array
    {
        $row = [];
        foreach ($values as $value) {
            $row[] = self::cell($value);
        }

        return $row;
    }
}
