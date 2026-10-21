# frozen_string_literal: true

module Coss
  module Types
    class SuppressionCheck < Internal::Types::Model
      field :object, -> { Coss::Types::SuppressionCheckObject }, optional: false, nullable: false

      field :address, -> { String }, optional: false, nullable: false

      field :suppressed, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :suppressions, -> { Internal::Types::Array[Coss::Types::Suppression] }, optional: false, nullable: false
    end
  end
end
