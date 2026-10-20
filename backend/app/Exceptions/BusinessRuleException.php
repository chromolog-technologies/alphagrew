<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Thrown by Actions when a request is valid but breaks a business rule
 * (e.g. applying to a closed drive). Rendered as JSON {"message": ...} with the given status.
 */
class BusinessRuleException extends HttpException
{
    public static function forbidden(string $message): self
    {
        return new self(403, $message);
    }

    public static function unprocessable(string $message): self
    {
        return new self(422, $message);
    }
}
