# frozen_string_literal: true

module Coss
  module Billing
    module Invoices
      module Types
        module ListInvoicesRequestStatus
          extend Coss::Internal::Types::Enum

          OPEN = "open"
          PAID = "paid"
          VOID = "void"
          UNCOLLECTIBLE = "uncollectible"
        end
      end
    end
  end
end
