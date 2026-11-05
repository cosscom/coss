# frozen_string_literal: true

module Coss
  module Scheduling
    module Reassignments
      module Types
        class CreateSchedulingReassignmentRequest < Internal::Types::Model
          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :selection, -> { Coss::Types::SchedulingReassignmentSelection }, optional: false, nullable: false

          field :strategy, -> { Coss::Types::SchedulingReassignmentStrategy }, optional: true, nullable: false

          field :reason_code, -> { Coss::Scheduling::Reassignments::Types::CreateSchedulingReassignmentRequestReasonCode }, optional: false, nullable: false

          field :note, -> { String }, optional: true, nullable: false

          field :overrides, -> { Internal::Types::Array[Coss::Scheduling::Reassignments::Types::CreateSchedulingReassignmentRequestOverridesItem] }, optional: true, nullable: false

          field :notify, -> { Coss::Scheduling::Reassignments::Types::CreateSchedulingReassignmentRequestNotify }, optional: true, nullable: false
        end
      end
    end
  end
end
