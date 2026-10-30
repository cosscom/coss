# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class CreateSuppressionRequest < Internal::Types::Model
          field :address, -> { String }, optional: false, nullable: false

          field :scope, -> { Coss::Email::Suppressions::Types::CreateSuppressionRequestScope }, optional: true, nullable: false

          field :subaccount, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
