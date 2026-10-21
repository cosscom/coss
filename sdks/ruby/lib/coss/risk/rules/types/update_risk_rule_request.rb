# frozen_string_literal: true

module Coss
  module Risk
    module Rules
      module Types
        class UpdateRiskRuleRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false

          field :position, -> { Integer }, optional: true, nullable: false

          field :events, -> { Internal::Types::Array[Coss::Types::RiskEvent] }, optional: true, nullable: false

          field :match, -> { Coss::Risk::Rules::Types::UpdateRiskRuleRequestMatch }, optional: true, nullable: false

          field :conditions, -> { Internal::Types::Array[Coss::Types::RiskRuleCondition] }, optional: true, nullable: false

          field :action, -> { Coss::Types::RiskDecision }, optional: true, nullable: false
        end
      end
    end
  end
end
