# frozen_string_literal: true

module Coss
  module Types
    module RiskCheckoutSignalsCardFunding
      extend Coss::Internal::Types::Enum

      CREDIT = "credit"
      DEBIT = "debit"
      PREPAID = "prepaid"
      UNKNOWN = "unknown"
    end
  end
end
