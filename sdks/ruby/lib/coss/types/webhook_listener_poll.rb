# frozen_string_literal: true

module Coss
  module Types
    class WebhookListenerPoll < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookListenerPollObject }, optional: false, nullable: false

      field :listener, -> { Coss::Types::WebhookListener }, optional: false, nullable: false

      field :deliveries, -> { Internal::Types::Array[Coss::Types::WebhookListenerDelivery] }, optional: false, nullable: false

      field :acknowledged, -> { Integer }, optional: false, nullable: false
    end
  end
end
