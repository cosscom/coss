# frozen_string_literal: true

module Coss
  module Types
    class AccountWebhookEventData < Internal::Types::Model
      field :organization_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::AccountWebhookEventDataStatus }, optional: false, nullable: false

      field :previous_status, -> { Coss::Types::AccountWebhookEventDataPreviousStatus }, optional: false, nullable: false

      field :reason, -> { String }, optional: false, nullable: true

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :checks, -> { Internal::Types::Array[Coss::Types::ReputationCheck] }, optional: false, nullable: false

      field :marketing, -> { Coss::Types::MarketingStanding }, optional: false, nullable: false
    end
  end
end
