# frozen_string_literal: true

module Coss
  module Inboxes
    module Types
      class GetInboxesRequest < Internal::Types::Model
        field :inbox_id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
