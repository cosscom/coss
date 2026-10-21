# frozen_string_literal: true

module Coss
  module Types
    class WebhookListenerDelivery < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookListenerDeliveryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :ack_token, -> { String }, optional: false, nullable: false

      field :event_id, -> { String }, optional: false, nullable: false

      field :event_type, -> { String }, optional: false, nullable: false

      field :attempt, -> { Integer }, optional: false, nullable: false

      field :body, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
