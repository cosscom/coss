# frozen_string_literal: true

module Coss
  module Types
    class WebhookDelivery < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookDeliveryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :event_id, -> { String }, optional: false, nullable: false

      field :event_type, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::WebhookDeliveryStatus }, optional: false, nullable: false

      field :attempt_count, -> { Integer }, optional: false, nullable: false

      field :next_attempt_at, -> { String }, optional: false, nullable: true

      field :last_status_code, -> { Integer }, optional: false, nullable: true

      field :last_error, -> { String }, optional: false, nullable: true

      field :payload, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false

      field :attempts, -> { Internal::Types::Array[Coss::Types::WebhookAttempt] }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
