# frozen_string_literal: true

module Coss
  module Types
    class DeletedWebhookListener < Internal::Types::Model
      field :object, -> { Coss::Types::DeletedWebhookListenerObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :deleted, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
