# frozen_string_literal: true

module Coss
  module Types
    class RiskAssessmentList < Internal::Types::Model
      field :object, -> { Coss::Types::RiskAssessmentListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::RiskAssessment] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
