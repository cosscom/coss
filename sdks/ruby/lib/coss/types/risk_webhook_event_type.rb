# frozen_string_literal: true

module Coss
  module Types
    module RiskWebhookEventType
      extend Coss::Internal::Types::Enum

      RISK_ASSESSMENT_REVIEW = "risk.assessment.review"
      RISK_ASSESSMENT_REVIEWED = "risk.assessment.reviewed"
    end
  end
end
