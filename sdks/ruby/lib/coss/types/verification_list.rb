# frozen_string_literal: true

module Coss
  module Types
    class VerificationList < Internal::Types::Model
      field :object, -> { Coss::Types::VerificationListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Verification] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
