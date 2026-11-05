# frozen_string_literal: true

module Coss
  module Types
    module SchedulingReassignmentStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      RUNNING = "running"
      COMPLETED = "completed"
      CANCELLED = "cancelled"
    end
  end
end
