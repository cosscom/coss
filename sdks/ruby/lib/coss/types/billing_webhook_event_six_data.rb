# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventSixData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :scope, -> { Coss::Types::BillingWebhookEventSixDataScope }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false

      field :percent, -> { Integer }, optional: false, nullable: false

      field :amount, -> { Integer }, optional: false, nullable: false

      field :spent, -> { Integer }, optional: false, nullable: false

      field :period, -> { Coss::Types::BillingWebhookEventSixDataPeriod }, optional: false, nullable: false
    end
  end
end
