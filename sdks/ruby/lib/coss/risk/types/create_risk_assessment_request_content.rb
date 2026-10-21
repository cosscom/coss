# frozen_string_literal: true

module Coss
  module Risk
    module Types
      # Content to classify with the event. Its scores go in `signals.content` and rules can test them; `content.*`
      # reasons fire only at thresholds you set.
      class CreateRiskAssessmentRequestContent < Internal::Types::Model
        field :text, -> { String }, optional: false, nullable: false
      end
    end
  end
end
