# frozen_string_literal: true

module Coss
  module Sms
    module Suppressions
      module Types
        class ListSuppressionsRequest < Internal::Types::Model
          field :phone_number, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
