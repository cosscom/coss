# frozen_string_literal: true

module Coss
  module Types
    # Only entries with this scope.
    class ExportSuppressionsRequestScope < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::ExportSuppressionsRequestScopeZero }

      member -> { Coss::Types::ExportSuppressionsRequestScopeOne }

      member -> { String }
    end
  end
end
