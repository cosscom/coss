# frozen_string_literal: true

module Coss
  module Types
    module FormSubmissionSpamReason
      extend Coss::Internal::Types::Enum

      HONEYPOT = "honeypot"
      RISK_BLOCK = "risk_block"
      RISK_REVIEW = "risk_review"
      CONTENT = "content"
    end
  end
end
