# frozen_string_literal: true

module Coss
  module Risk
    module Types
      class CreateRiskFeedbackRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :outcome, -> { Coss::Types::RiskOutcome }, optional: false, nullable: false

        field :note, -> { String }, optional: true, nullable: false
      end
    end
  end
end
