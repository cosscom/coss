# frozen_string_literal: true

module Coss
  module Types
    module VerificationWebhookEventType
      extend Coss::Internal::Types::Enum

      VERIFICATION_APPROVED = "verification.approved"
      VERIFICATION_FAILED = "verification.failed"
      VERIFICATION_BLOCKED = "verification.blocked"
    end
  end
end
