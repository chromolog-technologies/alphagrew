<?php

namespace App\Support;

/**
 * Text a user typed, made safe to put into a Markdown email (Laravel MailMessage lines are
 * rendered as Markdown). Without this, "[Verify account](http://evil.example)" in a name or
 * message would arrive as a real, clickable link. HTML is escaped separately by Blade.
 */
final class MailText
{
    public static function escape(?string $text): string
    {
        // Backslash-escape Markdown syntax. < and > are left to Blade, which already turns them
        // into &lt; and &gt;; escaping them here too would show "&lt;" in the email.
        return preg_replace('/([\\\\`*_{}\[\]()#+\-.!|~])/', '\\\\$1', (string) $text) ?? '';
    }
}
