# frozen_string_literal: true

module Coss
  module Types
    class WebhookEndpointList < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookEndpointListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::WebhookEndpoint] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
