# frozen_string_literal: true

module Coss
  module Types
    module LogLevel
      extend Coss::Internal::Types::Enum

      INFO = "info"
      WARNING = "warning"
      ERROR = "error"
    end
  end
end
