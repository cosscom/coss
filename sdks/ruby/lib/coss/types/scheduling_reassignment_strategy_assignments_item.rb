# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentStrategyAssignmentsItem < Internal::Types::Model
      field :booking, -> { String }, optional: false, nullable: false

      field :to_host, -> { String }, optional: false, nullable: false

      field :from_host, -> { String }, optional: true, nullable: false
    end
  end
end
