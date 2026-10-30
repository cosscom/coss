# frozen_string_literal: true

module Coss
  module Domains
    module Types
      class ListDomainsRequest < Internal::Types::Model
        field :subaccount, -> { String }, optional: true, nullable: false
      end
    end
  end
end
