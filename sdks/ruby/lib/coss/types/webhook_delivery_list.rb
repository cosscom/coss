# frozen_string_literal: true

module Coss
  module Types
    class WebhookDeliveryList < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookDeliveryListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::WebhookDelivery] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
