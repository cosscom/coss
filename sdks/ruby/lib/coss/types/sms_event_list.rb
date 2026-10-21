# frozen_string_literal: true

module Coss
  module Types
    class SmsEventList < Internal::Types::Model
      field :object, -> { Coss::Types::SmsEventListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SmsEvent] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
