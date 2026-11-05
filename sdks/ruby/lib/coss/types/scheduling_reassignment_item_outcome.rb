# frozen_string_literal: true

module Coss
  module Types
    module SchedulingReassignmentItemOutcome
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      REASSIGNED = "reassigned"
      SKIPPED_CHANGED = "skipped_changed"
      NO_CANDIDATE = "no_candidate"
      FAILED = "failed"
      CANCELLED = "cancelled"
    end
  end
end
