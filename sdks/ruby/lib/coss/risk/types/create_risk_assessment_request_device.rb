# frozen_string_literal: true

module Coss
  module Risk
    module Types
      # The browser the event came from: recognizes it across accounts (`duplicate.device`, device velocity, fraud
      # memory) and spots automation.
      class CreateRiskAssessmentRequestDevice < Internal::Types::Model
        field :token, -> { String }, optional: false, nullable: false
      end
    end
  end
end
