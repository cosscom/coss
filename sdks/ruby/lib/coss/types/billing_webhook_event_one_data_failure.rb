# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventOneDataFailure < Internal::Types::Model
      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
