# frozen_string_literal: true

module Coss
  module Types
    module BillingStatus
      extend Coss::Internal::Types::Enum

      ACTIVE = "active"
      PAST_DUE = "past_due"
      DELINQUENT = "delinquent"
    end
  end
end
