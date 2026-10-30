# frozen_string_literal: true

module Coss
  module Types
    module FormSubmissionStatus
      extend Coss::Internal::Types::Enum

      PENDING_CONFIRMATION = "pending_confirmation"
      ACCEPTED = "accepted"
      HELD = "held"
      SPAM = "spam"
    end
  end
end
