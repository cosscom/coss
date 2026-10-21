# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Properties
        module Types
          class UpdateContactPropertyRequest < Internal::Types::Model
            field :id, -> { String }, optional: false, nullable: false

            field :fallback, -> { Coss::Email::Contacts::Properties::Types::UpdateContactPropertyRequestFallback }, optional: false, nullable: true
          end
        end
      end
    end
  end
end
