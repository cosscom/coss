# frozen_string_literal: true

module Coss
  module Types
    class EmailWebhookEventDataDelivery < Internal::Types::Model
      field :smtp_response, -> { String }, optional: false, nullable: true
    end
  end
end
