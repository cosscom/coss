# frozen_string_literal: true

module Coss
  module Sms
    module Suppressions
      module Types
        class RemoveSuppressionsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
