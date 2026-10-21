# frozen_string_literal: true

module Coss
  module Billing
    module Credits
      module Types
        class ListCreditsRequest < Internal::Types::Model
          field :status, -> { Coss::Billing::Credits::Types::ListCreditsRequestStatus }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
