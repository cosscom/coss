# frozen_string_literal: true

module Coss
  module Types
    class Verification < Internal::Types::Model
      field :object, -> { Coss::Types::VerificationObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :channel, -> { Coss::Types::VerificationChannel }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false

      field :country, -> { String }, optional: false, nullable: true

      field :status, -> { Coss::Types::VerificationStatus }, optional: false, nullable: false

      field :failure, -> { Coss::Types::VerificationFailure }, optional: false, nullable: true

      field :reasons, -> { Internal::Types::Array[Coss::Types::VerificationReasonsItem] }, optional: false, nullable: false

      field :attempts, -> { Integer }, optional: false, nullable: false

      field :max_attempts, -> { Integer }, optional: false, nullable: false

      field :sends, -> { Internal::Types::Array[Coss::Types::VerificationSend] }, optional: false, nullable: false

      field :tags, -> { Internal::Types::Array[Coss::Types::VerificationTagsItem] }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false

      field :approved_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
