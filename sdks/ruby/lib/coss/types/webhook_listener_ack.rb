# frozen_string_literal: true

module Coss
  module Types
    class WebhookListenerAck < Internal::Types::Model
      field :delivery_id, -> { String }, optional: false, nullable: false

      field :ack_token, -> { String }, optional: false, nullable: false

      field :status_code, -> { Integer }, optional: false, nullable: true

      field :duration_ms, -> { Integer }, optional: false, nullable: false

      field :error, -> { String }, optional: false, nullable: true
    end
  end
end
