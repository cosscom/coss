# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class ListContactsAudiencesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
