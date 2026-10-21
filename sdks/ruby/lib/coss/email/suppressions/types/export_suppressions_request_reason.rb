# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        module ExportSuppressionsRequestReason
          extend Coss::Internal::Types::Enum

          BOUNCE = "bounce"
          COMPLAINT = "complaint"
          MANUAL = "manual"
          IMPORT = "import"
          UNSUBSCRIBE = "unsubscribe"
        end
      end
    end
  end
end
