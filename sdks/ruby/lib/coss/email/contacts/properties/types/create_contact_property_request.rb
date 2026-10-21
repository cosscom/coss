# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Properties
        module Types
          class CreateContactPropertyRequest < Internal::Types::Model
            field :key, -> { String }, optional: false, nullable: false

            field :type, -> { Coss::Email::Contacts::Properties::Types::CreateContactPropertyRequestType }, optional: false, nullable: false

            field :fallback, -> { Coss::Email::Contacts::Properties::Types::CreateContactPropertyRequestFallback }, optional: true, nullable: false
          end
        end
      end
    end
  end
end
