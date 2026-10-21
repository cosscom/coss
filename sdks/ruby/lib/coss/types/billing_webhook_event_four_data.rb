# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventFourData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::BillingWebhookEventFourDataReason }, optional: false, nullable: false
    end
  end
end
