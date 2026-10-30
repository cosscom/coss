# frozen_string_literal: true

module Coss
  module Types
    class InboxMessageReceivedWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::InboxMessageReceivedWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::InboxMessageReceivedWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::InboxMessageReceivedWebhookEventData }, optional: false, nullable: false
    end
  end
end
