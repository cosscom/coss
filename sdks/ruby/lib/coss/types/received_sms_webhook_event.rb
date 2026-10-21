# frozen_string_literal: true

module Coss
  module Types
    class ReceivedSmsWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::ReceivedSmsWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::ReceivedSmsWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::ReceivedSmsWebhookEventData }, optional: false, nullable: false
    end
  end
end
