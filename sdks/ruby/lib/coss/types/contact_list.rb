# frozen_string_literal: true

module Coss
  module Types
    class ContactList < Internal::Types::Model
      field :object, -> { Coss::Types::ContactListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::Contact] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
