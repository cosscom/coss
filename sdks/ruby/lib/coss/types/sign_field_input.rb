# frozen_string_literal: true

module Coss
  module Types
    class SignFieldInput < Internal::Types::Model
      extend Coss::Internal::Types::Union

      member -> { Coss::Types::SignFieldInputDocument }

      member -> { Coss::Types::SignFieldInputAnchor }
    end
  end
end
