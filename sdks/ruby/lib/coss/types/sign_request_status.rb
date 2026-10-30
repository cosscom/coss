# frozen_string_literal: true

module Coss
  module Types
    module SignRequestStatus
      extend Coss::Internal::Types::Enum

      DRAFT = "draft"
      SENT = "sent"
      COMPLETED = "completed"
      DECLINED = "declined"
      CANCELED = "canceled"
      EXPIRED = "expired"
    end
  end
end
