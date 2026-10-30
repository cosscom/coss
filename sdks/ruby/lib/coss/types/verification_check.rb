# frozen_string_literal: true

module Coss
  module Types
    class VerificationCheck < Internal::Types::Model
      field :object, -> { Coss::Types::VerificationCheckObject }, optional: false, nullable: false

      field :valid, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :verification, -> { Coss::Types::Verification }, optional: false, nullable: false
    end
  end
end
