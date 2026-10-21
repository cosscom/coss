# frozen_string_literal: true

module Coss
  module Types
    module HookEndpointWithSecretDisabledReason
      extend Coss::Internal::Types::Enum

      MANUAL = "manual"
      FAILING = "failing"
    end
  end
end
