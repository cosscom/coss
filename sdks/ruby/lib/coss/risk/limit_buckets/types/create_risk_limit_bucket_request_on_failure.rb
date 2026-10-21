# frozen_string_literal: true

module Coss
  module Risk
    module LimitBuckets
      module Types
        module CreateRiskLimitBucketRequestOnFailure
          extend Coss::Internal::Types::Enum

          ALLOW = "allow"
          DENY = "deny"
        end
      end
    end
  end
end
