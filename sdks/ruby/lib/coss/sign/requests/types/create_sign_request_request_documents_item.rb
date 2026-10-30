# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class CreateSignRequestRequestDocumentsItem < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Sign::Requests::Types::CreateSignRequestRequestDocumentsItemDocumentID }

          member -> { Coss::Sign::Requests::Types::CreateSignRequestRequestDocumentsItemContent }
        end
      end
    end
  end
end
