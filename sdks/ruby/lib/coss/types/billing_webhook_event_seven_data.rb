# frozen_string_literal: true

module Coss
  module Types
    class BillingWebhookEventSevenData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :scope, -> { Coss::Types::BillingWebhookEventSevenDataScope }, optional: false, nullable: false

      field :target_id, -> { String }, optional: false, nullable: false
    end
  end
end
