# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class RemoveContactAudiencesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :contact_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
