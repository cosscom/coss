# frozen_string_literal: true

module Coss
  module Types
    module HookEndpointDisabledReason
      extend Coss::Internal::Types::Enum

      MANUAL = "manual"
      FAILING = "failing"
    end
  end
end
