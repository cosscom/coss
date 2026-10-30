# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class CreateSignRequestRequestDocumentsItemContent < Internal::Types::Model
          field :filename, -> { String }, optional: false, nullable: false

          field :content, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
