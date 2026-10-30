# frozen_string_literal: true

module Coss
  module Types
    class FormSubmitter < Internal::Types::Model
      field :email_field, -> { String }, optional: false, nullable: false

      field :verify, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :confirmation_from, -> { String }, optional: false, nullable: true
    end
  end
end
