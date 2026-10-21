# frozen_string_literal: true

module Coss
  module Internal
    module Types
      module Unknown
        include Coss::Internal::Types::Type

        def coerce(value)
          value
        end
      end
    end
  end
end
