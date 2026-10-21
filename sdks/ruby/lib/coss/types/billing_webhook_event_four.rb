# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventFour < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventFourObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventFourType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventFourData }, optional: false, nullable: false
    end
  end
end
