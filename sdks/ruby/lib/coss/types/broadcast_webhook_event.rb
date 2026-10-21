# frozen_string_literal: true

module Coss
  module Types
    class BroadcastWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BroadcastWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::BroadcastWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::BroadcastWebhookEventData }, optional: false, nullable: false
    end
  end
end
