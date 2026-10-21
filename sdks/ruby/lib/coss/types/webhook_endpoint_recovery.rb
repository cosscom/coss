# frozen_string_literal: true

module Coss
  module Types
    class WebhookEndpointRecovery < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookEndpointRecoveryObject }, optional: false, nullable: false

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :requeued, -> { Integer }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
