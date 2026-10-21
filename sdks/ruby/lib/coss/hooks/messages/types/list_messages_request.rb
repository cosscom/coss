# frozen_string_literal: true

module Coss
  module Hooks
    module Messages
      module Types
        class ListMessagesRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :event_type, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
