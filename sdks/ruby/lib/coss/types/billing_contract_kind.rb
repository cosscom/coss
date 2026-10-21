# frozen_string_literal: true

module Coss
  module Types
    module BillingContractKind
      extend Coss::Internal::Types::Enum

      SELF_SERVE = "self_serve"
      SALES = "sales"
      INTERNAL = "internal"
    end
  end
end
