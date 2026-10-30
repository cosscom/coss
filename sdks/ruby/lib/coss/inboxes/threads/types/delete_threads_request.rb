# frozen_string_literal: true

module Coss
  module Inboxes
    module Threads
      module Types
        class DeleteThreadsRequest < Internal::Types::Model
          field :inbox_id, -> { String }, optional: false, nullable: false

          field :thread_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
