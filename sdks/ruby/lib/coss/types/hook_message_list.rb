# frozen_string_literal: true

module Coss
  module Types
    class HookMessageList < Internal::Types::Model
      field :object, -> { Coss::Types::HookMessageListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::HookMessage] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
