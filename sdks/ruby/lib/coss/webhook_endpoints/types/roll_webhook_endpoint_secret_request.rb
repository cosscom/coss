# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Types
      class RollWebhookEndpointSecretRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :previous_secret_expires_in, -> { Integer }, optional: true, nullable: false
      end
    end
  end
end
