# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class ListBroadcastsRequest < Internal::Types::Model
          field :status, -> { Coss::Email::Broadcasts::Types::ListBroadcastsRequestStatus }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
