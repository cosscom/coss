# frozen_string_literal: true

module Coss
  module Billing
    module Types
      module UsageBillingRequestGroupBy
        extend Coss::Internal::Types::Enum

        ENVIRONMENT = "environment"
        PROJECT = "project"
        API_KEY = "api_key"
        USER = "user"
      end
    end
  end
end
