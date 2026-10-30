# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class CreateSignRequestRequestSignersItem < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :email, -> { String }, optional: false, nullable: false

          field :delivery, -> { Coss::Sign::Requests::Types::CreateSignRequestRequestSignersItemDelivery }, optional: true, nullable: false

          field :order, -> { Integer }, optional: true, nullable: false

          field :client_ref, -> { String }, optional: true, nullable: false

          field :fields, -> { Internal::Types::Array[Coss::Types::SignFieldInput] }, optional: false, nullable: false
        end
      end
    end
  end
end
