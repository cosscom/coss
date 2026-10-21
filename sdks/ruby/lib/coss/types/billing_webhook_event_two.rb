# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventTwo < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventTwoObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventTwoType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventTwoData }, optional: false, nullable: false
    end
  end
end
