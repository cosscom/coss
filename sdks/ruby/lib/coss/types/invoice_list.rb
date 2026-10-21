# frozen_string_literal: true

module Coss
  module Types
    class InvoiceList < Internal::Types::Model
      field :object, -> { Coss::Types::InvoiceListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::InvoiceSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
