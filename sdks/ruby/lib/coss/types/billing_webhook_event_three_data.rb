# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventThreeData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :percent, -> { Integer }, optional: false, nullable: false

      field :of, -> { Coss::Types::BillingWebhookEventThreeDataOf }, optional: false, nullable: false

      field :meter, -> { Coss::Types::BillingWebhookEventThreeDataMeter }, optional: false, nullable: true

      field :period, -> { Coss::Types::BillingWebhookEventThreeDataPeriod }, optional: false, nullable: false
    end
  end
end
