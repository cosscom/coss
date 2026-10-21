# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.opened`.
    class EmailWebhookEventDataOpen < Internal::Types::Model
      field :user_agent, -> { String }, optional: false, nullable: true
    end
  end
end
