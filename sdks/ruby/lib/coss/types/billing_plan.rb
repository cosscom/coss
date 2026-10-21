# frozen_string_literal: true

module Coss
  module Types
    module BillingPlan
      extend Coss::Internal::Types::Enum

      FREE = "free"
      PRO = "pro"
      SCALE = "scale"
      ENTERPRISE = "enterprise"
    end
  end
end
