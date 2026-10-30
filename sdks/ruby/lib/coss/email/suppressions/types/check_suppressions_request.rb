# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class CheckSuppressionsRequest < Internal::Types::Model
          field :address, -> { String }, optional: false, nullable: false

          field :category, -> { String }, optional: true, nullable: false

          field :stream, -> { Coss::Email::Suppressions::Types::CheckSuppressionsRequestStream }, optional: true, nullable: false

          field :subaccount, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
