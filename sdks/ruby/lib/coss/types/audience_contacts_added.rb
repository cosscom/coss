# frozen_string_literal: true

module Coss
  module Types
    class AudienceContactsAdded < Internal::Types::Model
      field :object, -> { Coss::Types::AudienceContactsAddedObject }, optional: false, nullable: false

      field :added, -> { Integer }, optional: false, nullable: false

      field :existing, -> { Integer }, optional: false, nullable: false

      field :missing, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
