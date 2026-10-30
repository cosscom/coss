# frozen_string_literal: true

module Coss
  module Types
    module SignSignerStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      NOTIFIED = "notified"
      VIEWED = "viewed"
      SIGNED = "signed"
      DECLINED = "declined"
    end
  end
end
