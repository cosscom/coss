# frozen_string_literal: true

module Coss
  module Billing
    module Invoices
      module Types
        class GetInvoicesRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
