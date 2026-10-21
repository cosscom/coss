# frozen_string_literal: true

module Coss
  module Domains
    module Receiving
      module Types
        class DeleteReceivingRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
