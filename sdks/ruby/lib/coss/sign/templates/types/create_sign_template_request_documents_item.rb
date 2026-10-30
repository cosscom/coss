# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignTemplateRequestDocumentsItem < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestDocumentsItemDocumentID }

          member -> { Coss::Sign::Templates::Types::CreateSignTemplateRequestDocumentsItemContent }
        end
      end
    end
  end
end
