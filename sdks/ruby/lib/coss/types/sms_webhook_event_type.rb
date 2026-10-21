# frozen_string_literal: true

module Coss
  module Types
    module SmsWebhookEventType
      extend Coss::Internal::Types::Enum

      SMS_SCHEDULED = "sms.scheduled"
      SMS_SENT = "sms.sent"
      SMS_DELIVERED = "sms.delivered"
      SMS_UNDELIVERED = "sms.undelivered"
      SMS_FAILED = "sms.failed"
      SMS_SUPPRESSED = "sms.suppressed"
      SMS_CANCELED = "sms.canceled"
    end
  end
end
