# frozen_string_literal: true

module Coss
  module Types
    class SignDocumentList < Internal::Types::Model
      field :object, -> { Coss::Types::SignDocumentListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SignDocument] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
