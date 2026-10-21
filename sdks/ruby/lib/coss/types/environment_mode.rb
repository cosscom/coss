# frozen_string_literal: true

module Coss
  module Types
    module EnvironmentMode
      extend Coss::Internal::Types::Enum

      LIVE = "live"
      SANDBOX = "sandbox"
    end
  end
end
