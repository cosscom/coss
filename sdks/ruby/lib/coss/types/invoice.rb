# frozen_string_literal: true

module Coss
  module Types
    class Invoice < Internal::Types::Model
      field :object, -> { Coss::Types::InvoiceObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :number, -> { String }, optional: false, nullable: true

      field :kind, -> { Coss::Types::InvoiceKind }, optional: false, nullable: false

      field :status, -> { Coss::Types::InvoiceStatus }, optional: false, nullable: false

      field :currency, -> { Coss::Types::InvoiceCurrency }, optional: false, nullable: false

      field :period, -> { Coss::Types::InvoicePeriod }, optional: false, nullable: false

      field :subtotal, -> { Integer }, optional: false, nullable: false

      field :discount, -> { Integer }, optional: false, nullable: false

      field :credit, -> { Integer }, optional: false, nullable: false

      field :tax, -> { Integer }, optional: false, nullable: false

      field :total, -> { Integer }, optional: false, nullable: false

      field :amount_paid, -> { Integer }, optional: false, nullable: false

      field :amount_due, -> { Integer }, optional: false, nullable: false

      field :collection_method, -> { Coss::Types::InvoiceCollectionMethod }, optional: false, nullable: false

      field :due_at, -> { String }, optional: false, nullable: true

      field :finalized_at, -> { String }, optional: false, nullable: true

      field :paid_at, -> { String }, optional: false, nullable: true

      field :voided_at, -> { String }, optional: false, nullable: true

      field :hosted_url, -> { String }, optional: false, nullable: true

      field :pdf_url, -> { String }, optional: false, nullable: true

      field :lines, -> { Internal::Types::Array[Coss::Types::InvoiceLine] }, optional: false, nullable: false
    end
  end
end
