# frozen_string_literal: true

module Coss
  module Types
    # A plan change that takes effect later (a downgrade, a cancellation).
    class BillingScheduledChange < Internal::Types::Model
      field :effective_at, -> { String }, optional: false, nullable: false

      field :plan, -> { Coss::Types::BillingScheduledChangePlan }, optional: false, nullable: false
    end
  end
end
