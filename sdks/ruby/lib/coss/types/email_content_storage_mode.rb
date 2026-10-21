# frozen_string_literal: true

module Coss
  module Types
    module EmailContentStorageMode
      extend Coss::Internal::Types::Enum

      STORE = "store"
      DISCARD = "discard"
    end
  end
end
