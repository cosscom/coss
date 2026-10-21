# frozen_string_literal: true

module Coss
  module Types
    class Credit < Internal::Types::Model
      field :object, -> { Coss::Types::CreditObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Coss::Types::CreditKind }, optional: false, nullable: false

      field :amount, -> { Integer }, optional: false, nullable: false

      field :remaining, -> { Integer }, optional: false, nullable: false

      field :meter, -> { Coss::Types::CreditMeter }, optional: false, nullable: true

      field :meters, -> { Internal::Types::Array[Coss::Types::CreditMetersItem] }, optional: false, nullable: true

      field :applies_to, -> { Coss::Types::CreditAppliesTo }, optional: false, nullable: false

      field :source, -> { Coss::Types::CreditSource }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: false

      field :effective_at, -> { String }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: true

      field :voided_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
