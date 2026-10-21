# frozen_string_literal: true

module Coss
  module WebhookEvents
    module Types
      class CreateTestWebhookEventRequest < Internal::Types::Model
        field :type, -> { Coss::WebhookEvents::Types::CreateTestWebhookEventRequestType }, optional: false, nullable: false

        field :data, -> { Internal::Types::Hash[String, Object] }, optional: true, nullable: false
      end
    end
  end
end
