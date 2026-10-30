# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class ImportSuppressionsRequest < Internal::Types::Model
          field :subaccount, -> { String }, optional: true, nullable: false

          field :suppressions, -> { Internal::Types::Array[Coss::Email::Suppressions::Types::ImportSuppressionsRequestSuppressionsItem] }, optional: false, nullable: false
        end
      end
    end
  end
end
