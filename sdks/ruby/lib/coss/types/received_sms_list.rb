# frozen_string_literal: true

module Coss
  module Types
    class ReceivedSmsList < Internal::Types::Model
      field :object, -> { Coss::Types::ReceivedSmsListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::ReceivedSms] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
