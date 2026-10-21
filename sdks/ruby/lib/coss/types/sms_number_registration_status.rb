# frozen_string_literal: true

module Coss
  module Types
    module SmsNumberRegistrationStatus
      extend Coss::Internal::Types::Enum

      DRAFT = "draft"
      SUBMITTED = "submitted"
      IN_REVIEW = "in_review"
      APPROVED = "approved"
      REJECTED = "rejected"
      FAILED = "failed"
    end
  end
end
