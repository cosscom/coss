# frozen_string_literal: true

module Coss
  module Types
    class RiskRule < Internal::Types::Model
      field :object, -> { Coss::Types::RiskRuleObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :position, -> { Integer }, optional: false, nullable: false

      field :events, -> { Internal::Types::Array[Coss::Types::RiskEvent] }, optional: false, nullable: false

      field :match, -> { Coss::Types::RiskRuleMatch }, optional: false, nullable: false

      field :conditions, -> { Internal::Types::Array[Coss::Types::RiskRuleCondition] }, optional: false, nullable: false

      field :action, -> { Coss::Types::RiskDecision }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
