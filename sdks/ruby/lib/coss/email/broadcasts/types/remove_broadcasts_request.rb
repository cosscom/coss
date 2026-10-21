# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class RemoveBroadcastsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
