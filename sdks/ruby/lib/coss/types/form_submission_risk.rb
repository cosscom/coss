# frozen_string_literal: true

module Coss
  module Types
    # Risk's assessment; `null` when none ran (honeypot).
    class FormSubmissionRisk < Internal::Types::Model
      field :assessment_id, -> { String }, optional: false, nullable: true

      field :decision, -> { Coss::Types::FormSubmissionRiskDecision }, optional: false, nullable: true

      field :score, -> { Integer }, optional: false, nullable: true
    end
  end
end
