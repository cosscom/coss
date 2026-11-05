# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class UndoSchedulingReassignmentRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :reason_code, -> { Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequestReasonCode }, optional: true, nullable: false

          field :note, -> { String }, optional: true, nullable: false

          field :overrides, -> { Internal::Types::Array[Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequestOverridesItem] }, optional: true, nullable: false

          field :notify, -> { Coss::Scheduling::Reassignments::Types::UndoSchedulingReassignmentRequestNotify }, optional: true, nullable: false
        end
      end
    end
  end
end
