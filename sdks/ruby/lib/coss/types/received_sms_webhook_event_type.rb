# frozen_string_literal: true

module Coss
  module Types
    module ReceivedSmsWebhookEventType
      extend Coss::Internal::Types::Enum

      SMS_RECEIVED = "sms.received"
      SMS_OPTED_OUT = "sms.opted_out"
      SMS_OPTED_IN = "sms.opted_in"
    end
  end
end
