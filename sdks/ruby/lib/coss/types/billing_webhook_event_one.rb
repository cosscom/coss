# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventOne < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventOneObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventOneType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventOneData }, optional: false, nullable: false
    end
  end
end
