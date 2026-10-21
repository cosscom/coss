# frozen_string_literal: true

module Coss
  module WebhookListeners
    module Types
      class DeleteWebhookListenersRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
