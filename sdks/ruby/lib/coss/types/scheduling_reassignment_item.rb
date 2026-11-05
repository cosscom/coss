# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentItem < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignmentItemObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :booking, -> { String }, optional: false, nullable: false

      field :from_host, -> { String }, optional: false, nullable: true

      field :to_host, -> { String }, optional: false, nullable: true

      field :outcome, -> { Coss::Types::SchedulingReassignmentItemOutcome }, optional: false, nullable: false

      field :error_code, -> { String }, optional: false, nullable: true
    end
  end
end
