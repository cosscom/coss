# frozen_string_literal: true

module Coss
  module WebhookEndpoints
    module Types
      class GetWebhookEndpointsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
