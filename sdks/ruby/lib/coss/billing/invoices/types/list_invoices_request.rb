# frozen_string_literal: true

module Coss
  module Billing
    module Invoices
      module Types
        class ListInvoicesRequest < Internal::Types::Model
          field :status, -> { Coss::Billing::Invoices::Types::ListInvoicesRequestStatus }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
