# frozen_string_literal: true

module Coss
  module Types
    # Fields left out keep their current value; a new rule starts with all off. A send's own `tracking` option still
    # wins over the rule.
    class UpdateTrackingRuleRequest < Internal::Types::Model
      field :opens, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :clicks, -> { Internal::Types::Boolean }, optional: true, nullable: false

      field :unsubscribe, -> { Internal::Types::Boolean }, optional: true, nullable: false
    end
  end
end
