# frozen_string_literal: true

module Coss
  module Types
    class SchedulingReassignmentWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::SchedulingReassignmentWebhookEventObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::SchedulingReassignmentWebhookEventType }, optional: false, nullable: false

      field :data, -> { Coss::Types::SchedulingReassignmentWebhookEventData }, optional: false, nullable: false
    end
  end
end
