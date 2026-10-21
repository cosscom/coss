# frozen_string_literal: true

module Coss
  module Types
    class InvoiceLine < Internal::Types::Model
      field :object, -> { Coss::Types::InvoiceLineObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :kind, -> { Coss::Types::InvoiceLineKind }, optional: false, nullable: false

      field :description, -> { String }, optional: false, nullable: false

      field :meter, -> { Coss::Types::InvoiceLineMeter }, optional: false, nullable: true

      field :dimension, -> { String }, optional: false, nullable: true

      field :quantity, -> { Integer }, optional: false, nullable: true

      field :included_quantity, -> { Integer }, optional: false, nullable: true

      field :unit_price, -> { String }, optional: false, nullable: true

      field :amount, -> { Integer }, optional: false, nullable: false

      field :period, -> { Coss::Types::InvoiceLinePeriod }, optional: false, nullable: false
    end
  end
end
