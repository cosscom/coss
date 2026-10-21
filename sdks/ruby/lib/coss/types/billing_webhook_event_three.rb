# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventThree < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::BillingWebhookEventThreeObject }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::BillingWebhookEventThreeType }, optional: false, nullable: false

      field :data, -> { Coss::Types::BillingWebhookEventThreeData }, optional: false, nullable: false
    end
  end
end
