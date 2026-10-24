<?php

namespace App\Services\Resumes;

use Illuminate\Support\Facades\Process;

/**
 * Plain text of a PDF, best available engine first:
 * 1. smalot/pdfparser, when installed (recommended: `composer require smalot/pdfparser`);
 * 2. poppler `pdftotext`, when config('ai.resumes.pdftotext') points at it;
 * 3. a built-in reader for text-based PDFs: decompresses FlateDecode streams and collects the
 *    strings drawn by Tj / TJ / ' / " operators. It does not decode CID font encodings, and
 *    scanned (image-only) PDFs yield no text; those resumes fail parsing with a clear error.
 */
class PdfTextReader
{
    public function read(string $binary): string
    {
        if (class_exists(\Smalot\PdfParser\Parser::class)) {
            return (new \Smalot\PdfParser\Parser())->parseContent($binary)->getText();
        }

        if ($binary !== '' && ($command = config('ai.resumes.pdftotext'))) {
            $text = $this->withPdftotext($command, $binary);

            if ($text !== null) {
                return $text;
            }
        }

        return $this->builtIn($binary);
    }

    private function withPdftotext(string $command, string $binary): ?string
    {
        $path = tempnam(sys_get_temp_dir(), 'pdf');
        file_put_contents($path, $binary);

        try {
            $result = Process::timeout(20)->run([$command, '-layout', '-enc', 'UTF-8', $path, '-']);

            return $result->successful() ? $result->output() : null;
        } finally {
            @unlink($path);
        }
    }

    private function builtIn(string $binary): string
    {
        preg_match_all('/stream\r?\n(.*?)endstream/s', $binary, $streams);
        $lines = [];

        foreach ($streams[1] as $raw) {
            $content = @gzuncompress($raw) ?: @gzuncompress(rtrim($raw, "\r\n")) ?: $raw;

            if (str_contains($content, 'BT')) {
                $lines[] = $this->textOperators($content);
            }
        }

        $text = implode("\n", $lines);
        $text = preg_replace('/[ \t]+/', ' ', $text);

        return trim(preg_replace("/\n\s*\n+/", "\n\n", $text));
    }

    /** Walks one content stream, collecting shown strings and turning line moves into newlines. */
    private function textOperators(string $content): string
    {
        preg_match_all('/\((?:\\\\.|[^\\\\)])*\)|<[0-9A-Fa-f\s]*>|\[|\]|-?\d*\.?\d+|\/[^\s\/\[\]()<>]+|[A-Za-z\'"*]+/s', $content, $tokens);

        $out = '';
        $operands = [];
        $array = null;

        foreach ($tokens[0] as $token) {
            if ($token === '[') {
                $array = [];

                continue;
            }

            if ($token === ']') {
                $operands[] = ['a', $array ?? []];
                $array = null;

                continue;
            }

            $value = match (true) {
                $token[0] === '(' => ['s', $this->literal(substr($token, 1, -1))],
                $token[0] === '<' => ['s', $this->hex(substr($token, 1, -1))],
                is_numeric($token) => ['n', (float) $token],
                $token[0] === '/' => ['name', $token],
                default => null,
            };

            if ($value !== null) {
                $array !== null ? $array[] = $value : $operands[] = $value;

                continue;
            }

            // An operator: [type, value] operands precede it.
            [$type, $last] = end($operands) ?: [null, null];
            $out .= match ($token) {
                'Tj' => $type === 's' ? $last : '',
                "'", '"' => "\n".($type === 's' ? $last : ''),
                // Strings, with large negative kerning numbers standing for word gaps.
                'TJ' => $type === 'a'
                    ? implode('', array_map(fn (array $part) => $part[0] === 's' ? $part[1] : ($part[0] === 'n' && $part[1] < -150 ? ' ' : ''), $last))
                    : '',
                // Td / TD tx ty: a vertical move starts a new line.
                'Td', 'TD' => $type === 'n' && $last != 0 ? "\n" : ' ',
                'T*', 'Tm', 'ET' => "\n",
                default => '',
            };
            $operands = [];
        }

        return $out;
    }

    private function literal(string $value): string
    {
        $value = preg_replace_callback('/\\\\([0-7]{1,3}|.)/s', fn (array $m) => match ($m[1]) {
            'n' => "\n", 'r' => "\r", 't' => "\t", 'b', 'f' => '',
            '(' , ')', '\\' => $m[1],
            default => ctype_digit($m[1]) ? chr(octdec($m[1]) % 256) : '',
        }, $value) ?? $value;

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1252');
    }

    private function hex(string $value): string
    {
        $bytes = @hex2bin(preg_replace('/\s+/', '', strlen($value) % 2 ? $value.'0' : $value)) ?: '';

        // Two-byte strings whose high bytes are all zero are plain ASCII (common in CID fonts).
        if (strlen($bytes) % 2 === 0 && preg_match('/^(?:\x00[\x20-\x7E])+$/', $bytes)) {
            return str_replace("\0", '', $bytes);
        }

        return preg_match('/^[\x20-\x7E\r\n\t]*$/', $bytes) ? $bytes : '';
    }
}
