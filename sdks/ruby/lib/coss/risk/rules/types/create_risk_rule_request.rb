# frozen_string_literal: true

module Coss
  module Risk
    module Rules
      module Types
        class CreateRiskRuleRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :position, -> { Integer }, optional: true, nullable: false

          field :events, -> { Internal::Types::Array[Coss::Types::RiskEvent] }, optional: true, nullable: false

          field :match, -> { Coss::Risk::Rules::Types::CreateRiskRuleRequestMatch }, optional: true, nullable: false

          field :conditions, -> { Internal::Types::Array[Coss::Types::RiskRuleCondition] }, optional: false, nullable: false

          field :action, -> { Coss::Types::RiskDecision }, optional: false, nullable: false
        end
      end
    end
  end
end
