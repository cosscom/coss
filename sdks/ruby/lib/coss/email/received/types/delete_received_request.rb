# frozen_string_literal: true

module Coss
  module Email
    module Received
      module Types
        class DeleteReceivedRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
