# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class ListEmailsBroadcastsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
