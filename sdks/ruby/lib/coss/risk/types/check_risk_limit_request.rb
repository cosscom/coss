# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class CheckRiskLimitRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :bucket, -> { String }, optional: false, nullable: false

        field :key, -> { String }, optional: false, nullable: false

        field :cost, -> { Integer }, optional: true, nullable: false
      end
    end
  end
end
