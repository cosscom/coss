# frozen_string_literal: true

module Coss
  module Types
    class CreditList < Internal::Types::Model
      field :object, -> { Coss::Types::CreditListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Credit] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
