# frozen_string_literal: true

module Coss
  module Email
    module Received
      module Types
        class GetAttachmentReceivedRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :attachment_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
