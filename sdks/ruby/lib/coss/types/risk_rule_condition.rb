# frozen_string_literal: true

module Coss
  module Types
    # A test of one field. A field without a value (no IP, no email…) never matches, whatever the operator.
    class RiskRuleCondition < Internal::Types::Model
      field :field, -> { Coss::Types::RiskRuleConditionField }, optional: false, nullable: false

      field :operator, -> { Coss::Types::RiskRuleConditionOperator }, optional: false, nullable: false

      field :value, -> { Coss::Types::RiskRuleConditionValue }, optional: false, nullable: false
    end
  end
end
