# frozen_string_literal: true

module Coss
  module Types
    class SmsNumberList < Internal::Types::Model
      field :object, -> { Coss::Types::SmsNumberListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SmsNumber] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
