# frozen_string_literal: true

module Coss
  module Types
    class AccountWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::AccountWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::AccountWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::AccountWebhookEventData }, optional: false, nullable: false
    end
  end
end
