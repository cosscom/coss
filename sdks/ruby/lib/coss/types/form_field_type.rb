# frozen_string_literal: true

module Coss
  module Types
    module FormFieldType
      extend Coss::Internal::Types::Enum

      TEXT = "text"
      EMAIL = "email"
      TEXTAREA = "textarea"
      NUMBER = "number"
      TEL = "tel"
      URL = "url"
      DATE = "date"
      SELECT = "select"
      RADIO = "radio"
      CHECKBOX = "checkbox"
      HIDDEN = "hidden"
      FILE = "file"
    end
  end
end
