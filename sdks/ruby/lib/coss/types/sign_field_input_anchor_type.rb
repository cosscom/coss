# frozen_string_literal: true

module Coss
  module Types
    module SignFieldInputAnchorType
      extend Coss::Internal::Types::Enum

      SIGNATURE = "signature"
      INITIALS = "initials"
      DATE_SIGNED = "date_signed"
      NAME = "name"
      EMAIL = "email"
      TEXT = "text"
      CHECKBOX = "checkbox"
    end
  end
end
