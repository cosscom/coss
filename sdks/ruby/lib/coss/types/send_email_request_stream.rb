# frozen_string_literal: true

module Coss
  module Types
    module SendEmailRequestStream
      extend Coss::Internal::Types::Enum

      TRANSACTIONAL = "transactional"
      MARKETING = "marketing"
    end
  end
end
