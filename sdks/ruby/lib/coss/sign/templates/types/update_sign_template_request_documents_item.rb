# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class UpdateSignTemplateRequestDocumentsItem < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestDocumentsItemDocumentID }

          member -> { Coss::Sign::Templates::Types::UpdateSignTemplateRequestDocumentsItemContent }
        end
      end
    end
  end
end
