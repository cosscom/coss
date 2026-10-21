# frozen_string_literal: true

module Coss
  module Types
    class RiskLimit < Internal::Types::Model
      field :object, -> { Coss::Types::RiskLimitObject }, optional: false, nullable: false

      field :bucket, -> { String }, optional: false, nullable: false

      field :allowed, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :limit, -> { Integer }, optional: false, nullable: false

      field :remaining, -> { Integer }, optional: false, nullable: false

      field :reset_ms, -> { Integer }, optional: false, nullable: false

      field :retry_after_ms, -> { Integer }, optional: false, nullable: true

      field :degraded, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
