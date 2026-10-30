# frozen_string_literal: true

module Coss
  module Inboxes
    module Types
      class ListInboxesRequest < Internal::Types::Model
        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
