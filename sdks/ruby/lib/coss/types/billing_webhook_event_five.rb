# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventFive < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventFiveObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventFiveType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventFiveData }, optional: false, nullable: false
    end
  end
end
