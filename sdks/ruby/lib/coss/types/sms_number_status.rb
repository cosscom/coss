# frozen_string_literal: true

module Coss
  module Types
    module SmsNumberStatus
      extend Coss::Internal::Types::Enum

      PENDING = "pending"
      ACTIVE = "active"
      RELEASING = "releasing"
    end
  end
end
