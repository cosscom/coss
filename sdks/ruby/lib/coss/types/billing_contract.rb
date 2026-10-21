# frozen_string_literal: true

module Coss
  module Types
    # The contract in effect; `null` on the Free plan.
    class BillingContract < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Coss::Types::BillingContractKind }, optional: false, nullable: false

      field :effective_from, -> { String }, optional: false, nullable: false

      field :effective_until, -> { String }, optional: false, nullable: true

      field :term_end, -> { String }, optional: false, nullable: true

      field :auto_renew, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
