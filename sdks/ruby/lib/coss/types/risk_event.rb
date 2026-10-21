# frozen_string_literal: true

module Coss
  module Types
    module RiskEvent
      extend Coss::Internal::Types::Enum

      SIGNUP = "signup"
      LOGIN = "login"
      MESSAGE = "message"
      CHECKOUT = "checkout"
      CUSTOM = "custom"
    end
  end
end
