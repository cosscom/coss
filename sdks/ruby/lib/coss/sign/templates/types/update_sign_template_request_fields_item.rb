# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class UpdateSignTemplateRequestFieldsItem < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestFieldsItemDocument }

          member -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestFieldsItemAnchor }
        end
      end
    end
  end
end
