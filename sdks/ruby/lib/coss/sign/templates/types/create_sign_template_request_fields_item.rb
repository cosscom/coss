# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignTemplateRequestFieldsItem < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestFieldsItemDocument }

          member -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestFieldsItemAnchor }
        end
      end
    end
  end
end
