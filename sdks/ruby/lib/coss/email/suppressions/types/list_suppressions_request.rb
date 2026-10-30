# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class ListSuppressionsRequest < Internal::Types::Model
          field :subaccount, -> { String }, optional: true, nullable: false

          field :address, -> { String }, optional: true, nullable: false

          field :scope, -> { Coss::Types::ListSuppressionsRequestScope }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
