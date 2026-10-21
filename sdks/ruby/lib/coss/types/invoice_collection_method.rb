# frozen_string_literal: true

module Coss
  module Types
    module InvoiceCollectionMethod
      extend Coss::Internal::Types::Enum

      CHARGE_AUTOMATICALLY = "charge_automatically"
      SEND_INVOICE = "send_invoice"
    end
  end
end
