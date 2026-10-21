# frozen_string_literal: true

module Coss
  module Domains
    module Dmarc
      module Types
        class GetDmarcRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
