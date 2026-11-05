# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class ItemsReassignmentsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
