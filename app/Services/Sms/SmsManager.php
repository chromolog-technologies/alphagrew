<?php

namespace App\Services\Sms;

use InvalidArgumentException;

/**
 * Picks the SMS driver from config/services.php (SMS_DRIVER): "log", "twilio", "msg91", or
 * empty to turn SMS off. When off, users are not offered the SMS option.
 */
class SmsManager
{
    public function enabled(): bool
    {
        return filled(config('services.sms.driver'));
    }

    public function sender(): SmsSender
    {
        $driver = (string) config('services.sms.driver');

        return match ($driver) {
            'log' => new LogSmsSender(),
            'twilio' => new TwilioSmsSender((string) config('services.sms.twilio.sid'), (string) config('services.sms.twilio.token'), (string) config('services.sms.twilio.from')),
            'msg91' => new Msg91SmsSender((string) config('services.sms.msg91.key'), (string) config('services.sms.msg91.flow_id')),
            default => throw new InvalidArgumentException("Unknown SMS driver [{$driver}]."),
        };
    }

    /**
     * Normalises a stored phone number to E.164. Ten-digit numbers get the default country code.
     * Returns null for anything that does not look like a phone number.
     */
    public static function normalise(?string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone);
        if ($digits === '' || $digits === null) {
            return null;
        }
        if (str_starts_with(trim((string) $phone), '+')) {
            return strlen($digits) >= 8 && strlen($digits) <= 15 ? '+'.$digits : null;
        }
        $digits = ltrim($digits, '0');
        if (strlen($digits) === 10) {
            return '+'.config('services.sms.default_country_code', '91').$digits;
        }

        return strlen($digits) >= 11 && strlen($digits) <= 15 ? '+'.$digits : null;
    }
}
