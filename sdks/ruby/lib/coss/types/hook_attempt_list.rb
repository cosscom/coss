# frozen_string_literal: true

module Coss
  module Types
    class HookAttemptList < Internal::Types::Model
      field :object, -> { Coss::Types::HookAttemptListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::HookAttempt] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
