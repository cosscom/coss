# frozen_string_literal: true

module Coss
  module Types
    module SuppressionReason
      extend Coss::Internal::Types::Enum

      BOUNCE = "bounce"
      COMPLAINT = "complaint"
      MANUAL = "manual"
      IMPORT = "import"
      UNSUBSCRIBE = "unsubscribe"
    end
  end
end
