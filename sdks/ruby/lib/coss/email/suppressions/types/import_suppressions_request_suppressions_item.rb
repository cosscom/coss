# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class ImportSuppressionsRequestSuppressionsItem < Internal::Types::Model
          field :address, -> { String }, optional: false, nullable: false

          field :scope, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
