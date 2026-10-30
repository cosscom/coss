# frozen_string_literal: true

module Coss
  module Sign
    module Documents
      module Types
        class UploadSignDocumentRequest < Internal::Types::Model
          field :filename, -> { String }, optional: false, nullable: false

          field :content, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
