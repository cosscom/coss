# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventFiveData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :credit, -> { Coss::Types::Credit }, optional: false, nullable: false
    end
  end
end
