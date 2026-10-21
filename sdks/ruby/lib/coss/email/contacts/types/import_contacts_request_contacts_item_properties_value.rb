# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class ImportContactsRequestContactsItemPropertiesValue < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { String }

          member -> { Integer }

          member -> { Internal::Types::Boolean }
        end
      end
    end
  end
end
