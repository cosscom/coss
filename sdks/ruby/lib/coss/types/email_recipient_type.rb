# frozen_string_literal: true

module Coss
  module Types
    module EmailRecipientType
      extend Coss::Internal::Types::Enum

      TO = "to"
      CC = "cc"
      BCC = "bcc"
    end
  end
end
