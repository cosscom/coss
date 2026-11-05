# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignCandidate < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingReassignCandidateObject }, optional: false, nullable: false

      field :host, -> { String }, optional: false, nullable: false

      field :uid, -> { String }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :member, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :available, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :reason, -> { String }, optional: false, nullable: true

      field :reasons, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :load, -> { Integer }, optional: false, nullable: false

      field :rank, -> { Integer }, optional: false, nullable: true

      field :meeting_provider_missing, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
