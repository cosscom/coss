# frozen_string_literal: true

module Coss
  module Types
    class HookApplicationList < Internal::Types::Model
      field :object, -> { Coss::Types::HookApplicationListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::HookApplication] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
