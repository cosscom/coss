# frozen_string_literal: true

module Coss
  module Types
    class DomainWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::DomainWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::DomainWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::DomainWebhookEventData }, optional: false, nullable: false
    end
  end
end
