<?php

namespace App\Services\Resumes;

use RuntimeException;
use ZipArchive;

/**
 * Plain text of a .docx (word/document.xml). Uses ZipArchive when the zip extension is loaded,
 * otherwise reads the archive itself (central directory + deflate via zlib), so it works on
 * hosts without ext-zip.
 */
class DocxTextReader
{
    public function read(string $binary): string
    {
        $xml = $this->entry($binary, 'word/document.xml')
            ?? throw new RuntimeException('Not a Word document (word/document.xml missing).');

        $xml = str_replace(['</w:p>', '<w:br/>', '<w:cr/>'], "\n", $xml);
        $xml = str_replace('<w:tab/>', "\t", $xml);

        return html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function entry(string $binary, string $name): ?string
    {
        if (class_exists(ZipArchive::class)) {
            $path = tempnam(sys_get_temp_dir(), 'docx');
            file_put_contents($path, $binary);

            try {
                $zip = new ZipArchive();

                if ($zip->open($path) !== true) {
                    return null;
                }

                $content = $zip->getFromName($name);
                $zip->close();

                return $content === false ? null : $content;
            } finally {
                @unlink($path);
            }
        }

        return $this->entryWithoutZipExtension($binary, $name);
    }

    /** Minimal zip reader: end-of-central-directory → central directory → local header → data. */
    private function entryWithoutZipExtension(string $binary, string $name): ?string
    {
        $eocd = strrpos($binary, "PK\x05\x06");

        if ($eocd === false || strlen($binary) < $eocd + 22) {
            return null;
        }

        // EOCD: +10 total entries (2 bytes), +12 directory size (4), +16 directory offset (4).
        ['entries' => $entries, 'offset' => $offset] = unpack('ventries/x4/Voffset', substr($binary, $eocd + 10, 10));

        for ($i = 0; $i < $entries; $i++) {
            if (substr($binary, $offset, 4) !== "PK\x01\x02") {
                return null;
            }

            $header = unpack('vmethod/x4/x4/Vcompressed/Vsize/vnameLength/vextraLength/vcommentLength/x8/Vlocal', substr($binary, $offset + 10, 36));
            $entryName = substr($binary, $offset + 46, $header['nameLength']);
            $offset += 46 + $header['nameLength'] + $header['extraLength'] + $header['commentLength'];

            if ($entryName !== $name) {
                continue;
            }

            $local = unpack('vnameLength/vextraLength', substr($binary, $header['local'] + 26, 4));
            $data = substr($binary, $header['local'] + 30 + $local['nameLength'] + $local['extraLength'], $header['compressed']);

            return match ($header['method']) {
                0 => $data,
                8 => @gzinflate($data) ?: null,
                default => null,
            };
        }

        return null;
    }
}
