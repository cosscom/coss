# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class CreateBroadcastRequest < Internal::Types::Model
          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :name, -> { String }, optional: false, nullable: false

          field :audience_id, -> { String }, optional: true, nullable: false

          field :segment_id, -> { String }, optional: true, nullable: false

          field :topic, -> { String }, optional: true, nullable: false

          field :from, -> { String }, optional: false, nullable: false

          field :reply_to, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :subject, -> { String }, optional: false, nullable: false

          field :preview_text, -> { String }, optional: true, nullable: false

          field :html, -> { String }, optional: true, nullable: false

          field :text, -> { String }, optional: true, nullable: false

          field :tracking, -> { Coss::Email::Broadcasts::Types::CreateBroadcastRequestTracking }, optional: true, nullable: false

          field :rate_per_second, -> { Integer }, optional: true, nullable: false

          field :send_, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "send"

          field :scheduled_at, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
