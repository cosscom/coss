# frozen_string_literal: true

module Coss
  module Types
    class EmailWebhookEventDataDelay < Internal::Types::Model
      field :type, -> { String }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: true

      field :diagnostic_code, -> { String }, optional: false, nullable: true
    end
  end
end
