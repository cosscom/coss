<?php

namespace Coss\Risk\Types;

use Coss\Core\Json\JsonSerializableType;
use Coss\Core\Json\JsonProperty;

class CreateRiskAssessmentRequestUser extends JsonSerializableType
{
    /**
     * @var ?string $id Your id for the user, when it exists (logins always; sign-ups once the account is created).
     */
    #[JsonProperty('id')]
    public ?string $id;

    /**
     * @var ?string $email The email address the user gave. Checked as given, even if invalid.
     */
    #[JsonProperty('email')]
    public ?string $email;

    /**
     * @param array{
     *   id?: ?string,
     *   email?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->id = $values['id'] ?? null;
        $this->email = $values['email'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
