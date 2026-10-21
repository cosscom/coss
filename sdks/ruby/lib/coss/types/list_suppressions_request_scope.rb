# frozen_string_literal: true

module Coss
  module Types
    # Only entries with this scope.
    class ListSuppressionsRequestScope < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::ListSuppressionsRequestScopeZero }

      member -> { Coss::Types::ListSuppressionsRequestScopeOne }

      member -> { String }
    end
  end
end
