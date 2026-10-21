# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventZero < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventZeroObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventZeroType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventZeroData }, optional: false, nullable: false
    end
  end
end
