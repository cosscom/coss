# frozen_string_literal: true

module Coss
  module Types
    module SchedulingOutOfOfficeConflictStatus
      extend Coss::Internal::Types::Enum

      HELD = "held"
      PENDING_APPROVAL = "pending_approval"
      CONFIRMED = "confirmed"
      CANCELLED = "cancelled"
      DECLINED = "declined"
    end
  end
end
