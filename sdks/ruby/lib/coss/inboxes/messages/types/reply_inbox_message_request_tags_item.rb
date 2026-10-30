# frozen_string_literal: true

module Coss
  module Inboxes
    module Messages
      module Types
        class ReplyInboxMessageRequestTagsItem < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :value, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
