# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentStrategy < Internal::Types::Model
      field :to_host, -> { String }, optional: true, nullable: false

      field :preferred_hosts, -> { Internal::Types::Array[String] }, optional: true, nullable: false

      field :otherwise, -> { Coss::Types::SchedulingReassignmentStrategyOtherwise }, optional: true, nullable: false

      field :assignments, -> { Internal::Types::Array[Coss::Types::SchedulingReassignmentStrategyAssignmentsItem] }, optional: true, nullable: false
    end
  end
end
