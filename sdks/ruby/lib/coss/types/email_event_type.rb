# frozen_string_literal: true

module Coss
  module Types
    module EmailEventType
      extend Coss::Internal::Types::Enum

      EMAIL_SENT = "email.sent"
      EMAIL_DELIVERED = "email.delivered"
      EMAIL_DELIVERY_DELAYED = "email.delivery_delayed"
      EMAIL_BOUNCED = "email.bounced"
      EMAIL_COMPLAINED = "email.complained"
      EMAIL_FAILED = "email.failed"
      EMAIL_SUPPRESSED = "email.suppressed"
      EMAIL_SCHEDULED = "email.scheduled"
      EMAIL_CANCELED = "email.canceled"
      EMAIL_OPENED = "email.opened"
      EMAIL_CLICKED = "email.clicked"
      EMAIL_RESCHEDULED = "email.rescheduled"
      EMAIL_UNSUBSCRIBED = "email.unsubscribed"
    end
  end
end
