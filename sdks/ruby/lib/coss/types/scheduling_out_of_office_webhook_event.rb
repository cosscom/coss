# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOutOfOfficeWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::SchedulingOutOfOfficeWebhookEventObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::SchedulingOutOfOfficeWebhookEventType }, optional: false, nullable: false

      field :data, -> { Coss::Types::SchedulingOutOfOfficeWebhookEventData }, optional: false, nullable: false
    end
  end
end
