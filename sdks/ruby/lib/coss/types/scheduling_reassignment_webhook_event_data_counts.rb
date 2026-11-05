# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentWebhookEventDataCounts < Internal::Types::Model
      field :total, -> { Integer }, optional: false, nullable: false

      field :pending, -> { Integer }, optional: false, nullable: false

      field :reassigned, -> { Integer }, optional: false, nullable: false

      field :skipped, -> { Integer }, optional: false, nullable: false

      field :no_candidate, -> { Integer }, optional: false, nullable: false

      field :failed, -> { Integer }, optional: false, nullable: false

      field :cancelled, -> { Integer }, optional: false, nullable: false
    end
  end
end
