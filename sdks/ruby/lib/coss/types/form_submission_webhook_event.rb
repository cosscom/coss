# frozen_string_literal: true

module Coss
  module Types
    class FormSubmissionWebhookEvent < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :object, -> { Coss::Types::FormSubmissionWebhookEventObject }, optional: false, nullable: false

      field :type, -> { Coss::Types::FormSubmissionWebhookEventType }, optional: false, nullable: false

      field :api_version, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::FormSubmissionWebhookEventData }, optional: false, nullable: false
    end
  end
end
