# frozen_string_literal: true

module Coss
  module Types
    module CreditMeter
      extend Coss::Internal::Types::Enum

      EMAIL_RECIPIENTS = "email.recipients"
      EMAIL_DEDICATED_IP = "email.dedicated_ip"
      SMS_SEGMENTS = "sms.segments"
      VIDEO_PARTICIPANT_MINUTES = "video.participant_minutes"
      SCHEDULING_BOOKINGS = "scheduling.bookings"
    end
  end
end
