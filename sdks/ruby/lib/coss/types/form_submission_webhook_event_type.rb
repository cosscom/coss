# frozen_string_literal: true

module Coss
  module Types
    module FormSubmissionWebhookEventType
      extend Coss::Internal::Types::Enum

      FORM_SUBMISSION_RECEIVED = "form.submission.received"
      FORM_SUBMISSION_FLAGGED = "form.submission.flagged"
    end
  end
end
