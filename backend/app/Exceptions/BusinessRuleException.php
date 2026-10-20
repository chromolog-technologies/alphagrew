<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Thrown by Actions when a request is valid but breaks a business rule
 * (e.g. applying to a closed drive). Rendered as JSON {"message": ..., ...details}
 * with the given status.
 */
class BusinessRuleException extends HttpException
{
    /**
     * @param  array<string, mixed>  $details  extra top-level JSON keys, e.g. the subjects blocking a publish
     */
    public function __construct(int $statusCode, string $message, private readonly array $details = [])
    {
        parent::__construct($statusCode, $message);
    }

    public static function forbidden(string $message): self
    {
        return new self(403, $message);
    }

    /** The record is in the wrong state for this request (e.g. answering a finished interview). */
    public static function conflict(string $message): self
    {
        return new self(409, $message);
    }

    /**
     * @param  array<string, mixed>  $details
     */
    public static function unprocessable(string $message, array $details = []): self
    {
        return new self(422, $message, $details);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), ...$this->details], $this->getStatusCode());
    }
}
