# frozen_string_literal: true

module Coss
  module Types
    class SignRequestList < Internal::Types::Model
      field :object, -> { Coss::Types::SignRequestListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SignRequest] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
