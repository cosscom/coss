# frozen_string_literal: true

module Coss
  module Domains
    module Types
      class CreateDomainRequest < Internal::Types::Model
        field :name, -> { String }, optional: false, nullable: false

        field :subaccount, -> { String }, optional: true, nullable: false
      end
    end
  end
end
