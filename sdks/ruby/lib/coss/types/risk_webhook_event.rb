# frozen_string_literal: true

module Coss
  module Types
    class RiskWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::RiskWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::RiskWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::RiskWebhookEventData }, optional: false, nullable: false
    end
  end
end
