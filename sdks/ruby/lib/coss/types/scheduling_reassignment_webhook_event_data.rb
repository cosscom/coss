# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentWebhookEventData < Internal::Types::Model
      field :reassignment_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SchedulingReassignmentWebhookEventDataStatus }, optional: false, nullable: false

      field :out_of_office_id, -> { String }, optional: false, nullable: true

      field :counts, -> { Coss::Types::SchedulingReassignmentWebhookEventDataCounts }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false
    end
  end
end
