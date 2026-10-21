<?php

namespace Coss\Types;

use Coss\Core\Json\JsonSerializableType;
use Exception;

class SegmentFilterConditionsItemConditionsConditionsItem extends JsonSerializableType
{
    /**
     * @var (
     *    'property'
     *   |'email'
     *   |'audience'
     *   |'topic'
     *   |'created_at'
     *   |'_unknown'
     * ) $field
     */
    public readonly string $field;

    /**
     * @var (
     *    SegmentFilterConditionsItemConditionsConditionsItemProperty
     *   |SegmentFilterConditionsItemConditionsConditionsItemEmail
     *   |SegmentFilterConditionsItemConditionsConditionsItemAudience
     *   |SegmentFilterConditionsItemConditionsConditionsItemTopic
     *   |SegmentFilterConditionsItemConditionsConditionsItemCreatedAt
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   field: (
     *    'property'
     *   |'email'
     *   |'audience'
     *   |'topic'
     *   |'created_at'
     *   |'_unknown'
     * ),
     *   value: (
     *    SegmentFilterConditionsItemConditionsConditionsItemProperty
     *   |SegmentFilterConditionsItemConditionsConditionsItemEmail
     *   |SegmentFilterConditionsItemConditionsConditionsItemAudience
     *   |SegmentFilterConditionsItemConditionsConditionsItemTopic
     *   |SegmentFilterConditionsItemConditionsConditionsItemCreatedAt
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->field = $values['field'];
        $this->value = $values['value'];
    }

    /**
     * @param SegmentFilterConditionsItemConditionsConditionsItemProperty $property
     * @return SegmentFilterConditionsItemConditionsConditionsItem
     */
    public static function property(SegmentFilterConditionsItemConditionsConditionsItemProperty $property): SegmentFilterConditionsItemConditionsConditionsItem
    {
        return new SegmentFilterConditionsItemConditionsConditionsItem([
            'field' => 'property',
            'value' => $property,
        ]);
    }

    /**
     * @param SegmentFilterConditionsItemConditionsConditionsItemEmail $email
     * @return SegmentFilterConditionsItemConditionsConditionsItem
     */
    public static function email(SegmentFilterConditionsItemConditionsConditionsItemEmail $email): SegmentFilterConditionsItemConditionsConditionsItem
    {
        return new SegmentFilterConditionsItemConditionsConditionsItem([
            'field' => 'email',
            'value' => $email,
        ]);
    }

    /**
     * @param SegmentFilterConditionsItemConditionsConditionsItemAudience $audience
     * @return SegmentFilterConditionsItemConditionsConditionsItem
     */
    public static function audience(SegmentFilterConditionsItemConditionsConditionsItemAudience $audience): SegmentFilterConditionsItemConditionsConditionsItem
    {
        return new SegmentFilterConditionsItemConditionsConditionsItem([
            'field' => 'audience',
            'value' => $audience,
        ]);
    }

    /**
     * @param SegmentFilterConditionsItemConditionsConditionsItemTopic $topic
     * @return SegmentFilterConditionsItemConditionsConditionsItem
     */
    public static function topic(SegmentFilterConditionsItemConditionsConditionsItemTopic $topic): SegmentFilterConditionsItemConditionsConditionsItem
    {
        return new SegmentFilterConditionsItemConditionsConditionsItem([
            'field' => 'topic',
            'value' => $topic,
        ]);
    }

    /**
     * @param SegmentFilterConditionsItemConditionsConditionsItemCreatedAt $createdAt
     * @return SegmentFilterConditionsItemConditionsConditionsItem
     */
    public static function createdAt(SegmentFilterConditionsItemConditionsConditionsItemCreatedAt $createdAt): SegmentFilterConditionsItemConditionsConditionsItem
    {
        return new SegmentFilterConditionsItemConditionsConditionsItem([
            'field' => 'created_at',
            'value' => $createdAt,
        ]);
    }

    /**
     * @return bool
     */
    public function isProperty(): bool
    {
        return $this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemProperty && $this->field === 'property';
    }

    /**
     * @return SegmentFilterConditionsItemConditionsConditionsItemProperty
     */
    public function asProperty(): SegmentFilterConditionsItemConditionsConditionsItemProperty
    {
        if (!($this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemProperty && $this->field === 'property')) {
            throw new Exception(
                "Expected property; got " . $this->field . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isEmail(): bool
    {
        return $this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemEmail && $this->field === 'email';
    }

    /**
     * @return SegmentFilterConditionsItemConditionsConditionsItemEmail
     */
    public function asEmail(): SegmentFilterConditionsItemConditionsConditionsItemEmail
    {
        if (!($this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemEmail && $this->field === 'email')) {
            throw new Exception(
                "Expected email; got " . $this->field . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAudience(): bool
    {
        return $this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemAudience && $this->field === 'audience';
    }

    /**
     * @return SegmentFilterConditionsItemConditionsConditionsItemAudience
     */
    public function asAudience(): SegmentFilterConditionsItemConditionsConditionsItemAudience
    {
        if (!($this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemAudience && $this->field === 'audience')) {
            throw new Exception(
                "Expected audience; got " . $this->field . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTopic(): bool
    {
        return $this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemTopic && $this->field === 'topic';
    }

    /**
     * @return SegmentFilterConditionsItemConditionsConditionsItemTopic
     */
    public function asTopic(): SegmentFilterConditionsItemConditionsConditionsItemTopic
    {
        if (!($this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemTopic && $this->field === 'topic')) {
            throw new Exception(
                "Expected topic; got " . $this->field . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isCreatedAt(): bool
    {
        return $this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemCreatedAt && $this->field === 'created_at';
    }

    /**
     * @return SegmentFilterConditionsItemConditionsConditionsItemCreatedAt
     */
    public function asCreatedAt(): SegmentFilterConditionsItemConditionsConditionsItemCreatedAt
    {
        if (!($this->value instanceof SegmentFilterConditionsItemConditionsConditionsItemCreatedAt && $this->field === 'created_at')) {
            throw new Exception(
                "Expected created_at; got " . $this->field . " with value of type " . get_debug_type($this->value),
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
        $result['field'] = $this->field;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->field) {
            case 'property':
                $value = $this->asProperty()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'email':
                $value = $this->asEmail()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'audience':
                $value = $this->asAudience()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'topic':
                $value = $this->asTopic()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'created_at':
                $value = $this->asCreatedAt()->jsonSerialize();
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
        if (!array_key_exists('field', $data)) {
            throw new Exception(
                "JSON data is missing property 'field'",
            );
        }
        $field = $data['field'];
        if (!(is_string($field))) {
            throw new Exception(
                "Expected property 'field' in JSON data to be string, instead received " . get_debug_type($data['field']),
            );
        }

        $args['field'] = $field;
        switch ($field) {
            case 'property':
                $args['value'] = SegmentFilterConditionsItemConditionsConditionsItemProperty::jsonDeserialize($data);
                break;
            case 'email':
                $args['value'] = SegmentFilterConditionsItemConditionsConditionsItemEmail::jsonDeserialize($data);
                break;
            case 'audience':
                $args['value'] = SegmentFilterConditionsItemConditionsConditionsItemAudience::jsonDeserialize($data);
                break;
            case 'topic':
                $args['value'] = SegmentFilterConditionsItemConditionsConditionsItemTopic::jsonDeserialize($data);
                break;
            case 'created_at':
                $args['value'] = SegmentFilterConditionsItemConditionsConditionsItemCreatedAt::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['field'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
