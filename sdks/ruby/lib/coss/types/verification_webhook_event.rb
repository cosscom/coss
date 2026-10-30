# frozen_string_literal: true

module Coss
  module Types
    class VerificationWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::VerificationWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::VerificationWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::VerificationWebhookEventData }, optional: false, nullable: false
    end
  end
end
