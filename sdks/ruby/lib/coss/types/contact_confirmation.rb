# frozen_string_literal: true

module Coss
  module Types
    class ContactConfirmation < Internal::Types::Model
      field :object, -> { Coss::Types::ContactConfirmationObject }, optional: false, nullable: false

      field :contact_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::ContactConfirmationStatus }, optional: false, nullable: false
    end
  end
end
