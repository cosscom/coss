# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        module UndoSchedulingReassignmentRequestNotifyHosts
          extend Coss::Internal::Types::Enum

          DIGEST = "digest"
          EACH = "each"
          NONE = "none"
        end
      end
    end
  end
end
