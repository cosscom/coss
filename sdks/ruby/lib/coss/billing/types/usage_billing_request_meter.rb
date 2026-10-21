# frozen_string_literal: true

module Coss
  module Billing
    module Types
      module UsageBillingRequestMeter
        extend Coss::Internal::Types::Enum

        EMAIL_RECIPIENTS = "email.recipients"
        EMAIL_DEDICATED_IP = "email.dedicated_ip"
        SMS_SEGMENTS = "sms.segments"
        SMS_RECEIVED_SEGMENTS = "sms.received_segments"
        SMS_NUMBERS = "sms.numbers"
        SMS_REGISTRATIONS = "sms.registrations"
        VIDEO_PARTICIPANT_MINUTES = "video.participant_minutes"
        SCHEDULING_BOOKINGS = "scheduling.bookings"
      end
    end
  end
end
