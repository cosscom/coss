# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignCandidateList < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignCandidateListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SchedulingReassignCandidate] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
