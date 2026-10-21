# frozen_string_literal: true

module Coss
  module Types
    class WebhookTestEvent < Internal::Types::Model
      field :object, -> { Coss::Types::WebhookTestEventObject }, optional: false, nullable: false

      field :event, -> { Coss::Types::WebhookTestEventEvent }, optional: false, nullable: false

      field :endpoints, -> { Integer }, optional: false, nullable: false

      field :listeners, -> { Integer }, optional: false, nullable: false
    end
  end
end
