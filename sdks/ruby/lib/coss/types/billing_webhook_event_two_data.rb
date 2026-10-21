# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventTwoData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :change, -> { Coss::Types::BillingWebhookEventTwoDataChange }, optional: false, nullable: false

      field :plan, -> { Coss::Types::BillingWebhookEventTwoDataPlan }, optional: false, nullable: false

      field :previous_plan, -> { Coss::Types::BillingWebhookEventTwoDataPreviousPlan }, optional: false, nullable: false

      field :effective_at, -> { String }, optional: false, nullable: false
    end
  end
end
