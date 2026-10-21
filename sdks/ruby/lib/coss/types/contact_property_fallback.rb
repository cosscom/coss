# frozen_string_literal: true

module Coss
  module Types
    # Used in templates for contacts without a value.
    class ContactPropertyFallback < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { String }

      member -> { Integer }

      member -> { Internal::Types::Boolean }
    end
  end
end
