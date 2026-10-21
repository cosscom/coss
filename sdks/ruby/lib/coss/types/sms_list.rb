# frozen_string_literal: true

module Coss
  module Types
    class SmsList < Internal::Types::Model
      field :object, -> { Coss::Types::SmsListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Sms] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
