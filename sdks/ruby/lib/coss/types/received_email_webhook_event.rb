# frozen_string_literal: true

module Coss
  module Types
    class ReceivedEmailWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::ReceivedEmailWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::ReceivedEmailWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::ReceivedEmailWebhookEventData }, optional: false, nullable: false
    end
  end
end
