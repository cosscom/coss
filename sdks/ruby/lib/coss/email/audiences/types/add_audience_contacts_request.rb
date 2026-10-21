# frozen_string_literal: true

module Coss
  module Email
    module Audiences
      module Types
        class AddAudienceContactsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :contacts, -> { Internal::Types::Array[String] }, optional: false, nullable: false
        end
      end
    end
  end
end
