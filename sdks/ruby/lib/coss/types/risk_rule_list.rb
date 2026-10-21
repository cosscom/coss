# frozen_string_literal: true

module Coss
  module Types
    # Every rule of the environment (at most 50), in evaluation order.
    class RiskRuleList < Internal::Types::Model
      field :object, -> { Coss::Types::RiskRuleListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::RiskRule] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
