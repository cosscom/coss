# frozen_string_literal: true

module Coss
  module Verify
    module Types
      class StartVerificationRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :to, -> { String }, optional: false, nullable: false

        field :channel, -> { Coss::Verify::Types::StartVerificationRequestChannel }, optional: true, nullable: false

        field :ip, -> { String }, optional: true, nullable: false

        field :user_id, -> { String }, optional: true, nullable: false

        field :tags, -> { Internal::Types::Array[Coss::Verify::Types::StartVerificationRequestTagsItem] }, optional: true, nullable: false
      end
    end
  end
end
