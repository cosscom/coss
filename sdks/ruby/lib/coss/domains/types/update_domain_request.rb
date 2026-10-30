# frozen_string_literal: true

module Coss
  module Domains
    module Types
      class UpdateDomainRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :shared_with_subaccounts, -> { Internal::Types::Boolean }, optional: false, nullable: false
      end
    end
  end
end
