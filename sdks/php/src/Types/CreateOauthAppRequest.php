<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Exception;

class CreateOauthAppRequest extends JsonSerializableType
{
    /**
     * @var (
     *    'google'
     *   |'microsoft'
     *   |'zoom'
     *   |'_unknown'
     * ) $provider
     */
    public readonly string $provider;

    /**
     * @var (
     *    CreateOauthAppRequestGoogle
     *   |CreateOauthAppRequestMicrosoft
     *   |CreateOauthAppRequestZoom
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   provider: (
     *    'google'
     *   |'microsoft'
     *   |'zoom'
     *   |'_unknown'
     * ),
     *   value: (
     *    CreateOauthAppRequestGoogle
     *   |CreateOauthAppRequestMicrosoft
     *   |CreateOauthAppRequestZoom
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->provider = $values['provider'];
        $this->value = $values['value'];
    }

    /**
     * @param CreateOauthAppRequestGoogle $google
     * @return CreateOauthAppRequest
     */
    public static function google(CreateOauthAppRequestGoogle $google): CreateOauthAppRequest
    {
        return new CreateOauthAppRequest([
            'provider' => 'google',
            'value' => $google,
        ]);
    }

    /**
     * @param CreateOauthAppRequestMicrosoft $microsoft
     * @return CreateOauthAppRequest
     */
    public static function microsoft(CreateOauthAppRequestMicrosoft $microsoft): CreateOauthAppRequest
    {
        return new CreateOauthAppRequest([
            'provider' => 'microsoft',
            'value' => $microsoft,
        ]);
    }

    /**
     * @param CreateOauthAppRequestZoom $zoom
     * @return CreateOauthAppRequest
     */
    public static function zoom(CreateOauthAppRequestZoom $zoom): CreateOauthAppRequest
    {
        return new CreateOauthAppRequest([
            'provider' => 'zoom',
            'value' => $zoom,
        ]);
    }

    /**
     * @return bool
     */
    public function isGoogle(): bool
    {
        return $this->value instanceof CreateOauthAppRequestGoogle && $this->provider === 'google';
    }

    /**
     * @return CreateOauthAppRequestGoogle
     */
    public function asGoogle(): CreateOauthAppRequestGoogle
    {
        if (!($this->value instanceof CreateOauthAppRequestGoogle && $this->provider === 'google')) {
            throw new Exception(
                "Expected google; got " . $this->provider . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMicrosoft(): bool
    {
        return $this->value instanceof CreateOauthAppRequestMicrosoft && $this->provider === 'microsoft';
    }

    /**
     * @return CreateOauthAppRequestMicrosoft
     */
    public function asMicrosoft(): CreateOauthAppRequestMicrosoft
    {
        if (!($this->value instanceof CreateOauthAppRequestMicrosoft && $this->provider === 'microsoft')) {
            throw new Exception(
                "Expected microsoft; got " . $this->provider . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isZoom(): bool
    {
        return $this->value instanceof CreateOauthAppRequestZoom && $this->provider === 'zoom';
    }

    /**
     * @return CreateOauthAppRequestZoom
     */
    public function asZoom(): CreateOauthAppRequestZoom
    {
        if (!($this->value instanceof CreateOauthAppRequestZoom && $this->provider === 'zoom')) {
            throw new Exception(
                "Expected zoom; got " . $this->provider . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['provider'] = $this->provider;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->provider) {
            case 'google':
                $value = $this->asGoogle()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'microsoft':
                $value = $this->asMicrosoft()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'zoom':
                $value = $this->asZoom()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('provider', $data)) {
            throw new Exception(
                "JSON data is missing property 'provider'",
            );
        }
        $provider = $data['provider'];
        if (!(is_string($provider))) {
            throw new Exception(
                "Expected property 'provider' in JSON data to be string, instead received " . get_debug_type($data['provider']),
            );
        }

        $args['provider'] = $provider;
        switch ($provider) {
            case 'google':
                $args['value'] = CreateOauthAppRequestGoogle::jsonDeserialize($data);
                break;
            case 'microsoft':
                $args['value'] = CreateOauthAppRequestMicrosoft::jsonDeserialize($data);
                break;
            case 'zoom':
                $args['value'] = CreateOauthAppRequestZoom::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['provider'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
