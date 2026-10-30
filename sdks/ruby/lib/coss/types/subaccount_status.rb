# frozen_string_literal: true

module Coss
  module Types
    module SubaccountStatus
      extend Coss::Internal::Types::Enum

      ACTIVE = "active"
      DISABLED = "disabled"
      DELETING = "deleting"
    end
  end
end
