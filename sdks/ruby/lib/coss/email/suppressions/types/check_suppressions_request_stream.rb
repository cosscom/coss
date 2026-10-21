# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        module CheckSuppressionsRequestStream
          extend Coss::Internal::Types::Enum

          TRANSACTIONAL = "transactional"
          MARKETING = "marketing"
        end
      end
    end
  end
end
