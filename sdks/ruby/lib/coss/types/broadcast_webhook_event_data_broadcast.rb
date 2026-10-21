# frozen_string_literal: true

module Coss
  module Types
    class BroadcastWebhookEventDataBroadcast < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::BroadcastWebhookEventDataBroadcastStatus }, optional: false, nullable: false
    end
  end
end
