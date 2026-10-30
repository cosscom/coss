# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignRequestFromTemplateRequestSignersItem < Internal::Types::Model
          field :role, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: false, nullable: false

          field :email, -> { String }, optional: false, nullable: false

          field :delivery, -> { Coss::Sign::Templates::Types::CreateSignRequestFromTemplateRequestSignersItemDelivery }, optional: true, nullable: false

          field :order, -> { Integer }, optional: true, nullable: false

          field :client_ref, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
