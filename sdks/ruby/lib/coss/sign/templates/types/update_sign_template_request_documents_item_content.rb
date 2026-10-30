# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class UpdateSignTemplateRequestDocumentsItemContent < Internal::Types::Model
          field :filename, -> { String }, optional: false, nullable: false

          field :content, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
