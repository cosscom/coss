# frozen_string_literal: true

module Coss
  module Types
    module EmailWebhookEventDataSuppressionReason
      extend Coss::Internal::Types::Enum

      BOUNCE = "bounce"
      COMPLAINT = "complaint"
      MANUAL = "manual"
      IMPORT = "import"
      UNSUBSCRIBE = "unsubscribe"
    end
  end
end
