# frozen_string_literal: true

module Coss
  module Types
    # Scores only: coss.com never decides what they mean for you. Neither the text nor the scores are stored.
    class RiskContentClassification < Internal::Types::Model
      field :object, -> { Coss::Types::RiskContentClassificationObject }, optional: false, nullable: false

      field :scores, -> { Coss::Types::RiskContentSignals }, optional: false, nullable: false

      field :truncated, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
