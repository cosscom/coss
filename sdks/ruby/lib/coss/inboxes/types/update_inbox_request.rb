# frozen_string_literal: true

module Coss
  module Inboxes
    module Types
      class UpdateInboxRequest < Internal::Types::Model
        field :inbox_id, -> { String }, optional: false, nullable: false

        field :display_name, -> { String }, optional: true, nullable: false
      end
    end
  end
end
