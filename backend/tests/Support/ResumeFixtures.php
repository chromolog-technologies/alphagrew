<?php

namespace Tests\Support;

/**
 * Builds small but real resume files in memory: a single-page text PDF with a FlateDecode
 * content stream, and a DOCX (zip with deflated entries, written by hand so tests need no ext-zip).
 */
final class ResumeFixtures
{
    /** @param  list<string>  $lines */
    public static function pdf(array $lines): string
    {
        $ops = "BT /F1 11 Tf 72 760 Td 14 TL\n";
        foreach ($lines as $line) {
            $ops .= '('.addcslashes($line, '()\\').") Tj T*\n";
        }
        $ops .= 'ET';
        $stream = gzcompress($ops);

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($stream)." /Filter /FlateDecode >>\nstream\n{$stream}\nendstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$body}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= 'xref
0 '.(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    /** @param  list<string>  $paragraphs */
    public static function docx(array $paragraphs): string
    {
        $body = implode('', array_map(
            fn (string $p) => '<w:p><w:r><w:t xml:space="preserve">'.htmlspecialchars($p, ENT_XML1).'</w:t></w:r></w:p>',
            $paragraphs,
        ));

        return self::zip([
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                .'<Default Extension="xml" ContentType="application/xml"/>'
                .'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
            'word/document.xml' => '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
                .$body.'</w:body></w:document>',
        ]);
    }

    /** @param  array<string, string>  $files  name => contents, each stored deflated */
    private static function zip(array $files): string
    {
        $data = '';
        $directory = '';

        foreach ($files as $name => $content) {
            $deflated = gzdeflate($content);
            $crc = crc32($content);
            $offset = strlen($data);

            $data .= pack('VvvvvvVVVvv', 0x04034B50, 20, 0, 8, 0, 0x21, $crc, strlen($deflated), strlen($content), strlen($name), 0).$name.$deflated;
            $directory .= pack('VvvvvvvVVVvvvvvVV', 0x02014B50, 20, 20, 0, 8, 0, 0x21, $crc, strlen($deflated), strlen($content), strlen($name), 0, 0, 0, 0, 0, $offset).$name;
        }

        return $data.$directory.pack('VvvvvVVv', 0x06054B50, 0, 0, count($files), count($files), strlen($directory), strlen($data), 0);
    }
}
