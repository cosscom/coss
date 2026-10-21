# frozen_string_literal: true

module Coss
  module Domains
    module Receiving
      module Types
        class CreateReceivingDomainRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :hostname, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
