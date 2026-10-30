# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      module Types
        # Fields left out keep their value; `null` removes a quota.
        class CreateSubaccountRequestQuotas < Internal::Types::Model
          field :recipients_per_day, -> { Integer }, optional: true, nullable: false

          field :recipients_per_second, -> { Integer }, optional: true, nullable: false

          field :burst, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
