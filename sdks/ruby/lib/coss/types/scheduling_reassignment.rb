# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignment < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignmentObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SchedulingReassignmentStatus }, optional: false, nullable: false

      field :reason_code, -> { Coss::Types::SchedulingReassignmentReasonCode }, optional: false, nullable: false

      field :out_of_office, -> { String }, optional: false, nullable: true

      field :undo_of, -> { String }, optional: false, nullable: true

      field :counts, -> { Coss::Types::SchedulingReassignmentCounts }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :started_at, -> { String }, optional: false, nullable: true

      field :finished_at, -> { String }, optional: false, nullable: true
    end
  end
end
