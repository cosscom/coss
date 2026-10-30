# frozen_string_literal: true

module Coss
  module Verify
    module Types
      class CheckVerificationRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :verification_id, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false

        field :code, -> { String }, optional: false, nullable: false
      end
    end
  end
end
