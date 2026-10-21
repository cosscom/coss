# frozen_string_literal: true

module Coss
  module Types
    module InvoiceSummaryStatus
      extend Coss::Internal::Types::Enum

      OPEN = "open"
      PAID = "paid"
      VOID = "void"
      UNCOLLECTIBLE = "uncollectible"
    end
  end
end
