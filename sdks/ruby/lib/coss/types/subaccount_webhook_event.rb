# frozen_string_literal: true

module Coss
  module Types
    class SubaccountWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::SubaccountWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::SubaccountWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::SubaccountWebhookEventData }, optional: false, nullable: false
    end
  end
end
