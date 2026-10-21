# frozen_string_literal: true

module Coss
  module Billing
    module Types
      module UsageBillingRequestGranularity
        extend Coss::Internal::Types::Enum

        HOUR = "hour"
        DAY = "day"
        MONTH = "month"
      end
    end
  end
end
