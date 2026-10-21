# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventSix < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventSixObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventSixType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventSixData }, optional: false, nullable: false
    end
  end
end
