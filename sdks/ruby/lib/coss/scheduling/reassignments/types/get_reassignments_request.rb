# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class GetReassignmentsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
