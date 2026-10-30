# frozen_string_literal: true

module Coss
  module Types
    module InvoiceLineMeter
      extend Coss::Internal::Types::Enum

      EMAIL_RECIPIENTS = "email.recipients"
      EMAIL_DEDICATED_IP = "email.dedicated_ip"
      EMAIL_RECEIVED = "email.received"
      EMAIL_INBOXES = "email.inboxes"
      SMS_SEGMENTS = "sms.segments"
      SMS_RECEIVED_SEGMENTS = "sms.received_segments"
      SMS_NUMBERS = "sms.numbers"
      SMS_REGISTRATIONS = "sms.registrations"
      SIGN_COMPLETED_REQUESTS = "sign.completed_requests"
      RISK_PHONE_CHECKS = "risk.phone_checks"
      VERIFY_VERIFICATIONS = "verify.verifications"
      VERIFY_SMS = "verify.sms"
      FORMS_SUBMISSIONS = "forms.submissions"
      VIDEO_PARTICIPANT_MINUTES = "video.participant_minutes"
      SCHEDULING_BOOKINGS = "scheduling.bookings"
    end
  end
end
