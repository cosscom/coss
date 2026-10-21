# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class RemoveContactAudiencesResponse < Internal::Types::Model
          field :object, -> { Coss::Email::Audiences::Types::RemoveContactAudiencesResponseObject }, optional: false, nullable: false

          field :audience_id, -> { String }, optional: false, nullable: false

          field :contact_id, -> { String }, optional: false, nullable: false

          field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
        end
      end
    end
  end
end
