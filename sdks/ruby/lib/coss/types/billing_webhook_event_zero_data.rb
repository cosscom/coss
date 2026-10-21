# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventZeroData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :invoice, -> { Coss::Types::InvoiceSummary }, optional: false, nullable: false
    end
  end
end
