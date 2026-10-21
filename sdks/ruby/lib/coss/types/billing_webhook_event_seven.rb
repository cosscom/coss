# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventSeven < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventSevenObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventSevenType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventSevenData }, optional: false, nullable: false
    end
  end
end
