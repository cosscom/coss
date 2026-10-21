# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class CreateAudienceRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
