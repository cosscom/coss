# frozen_string_literal: true

module Coss
  module Types
    class HookEventTypeList < Internal::Types::Model
      field :object, -> { Coss::Types::HookEventTypeListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::HookEventType] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
