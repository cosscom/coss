# frozen_string_literal: true

module Coss
  module Types
    class RiskRuleConditionValue < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Internal::Types::Boolean }

      member -> { Integer }

      member -> { String }

      member -> { Internal::Types::Array[String] }
    end
  end
end
