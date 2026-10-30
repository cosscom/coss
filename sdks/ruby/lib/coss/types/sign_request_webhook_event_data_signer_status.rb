# frozen_string_literal: true

module Coss
  module Types
    module SignRequestWebhookEventDataSignerStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      NOTIFIED = "notified"
      VIEWED = "viewed"
      SIGNED = "signed"
      DECLINED = "declined"
    end
  end
end
