# frozen_string_literal: true

module Coss
  module Types
    module EmailStream
      extend Coss::Internal::Types::Enum

      TRANSACTIONAL = "transactional"
      MARKETING = "marketing"
    end
  end
end
