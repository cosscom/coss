# frozen_string_literal: true

module Coss
  module Types
    class Broadcast < Internal::Types::Model
      field :object, -> { Coss::Types::BroadcastObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::BroadcastStatus }, optional: false, nullable: false

      field :audience_id, -> { String }, optional: false, nullable: true

      field :segment_id, -> { String }, optional: false, nullable: true

      field :topic, -> { String }, optional: false, nullable: true

      field :from, -> { String }, optional: false, nullable: false

      field :reply_to, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: false

      field :preview_text, -> { String }, optional: false, nullable: true

      field :html, -> { String }, optional: false, nullable: true

      field :text, -> { String }, optional: false, nullable: true

      field :tracking, -> { Coss::Types::BroadcastTracking }, optional: false, nullable: false

      field :rate_per_second, -> { Integer }, optional: false, nullable: true

      field :scheduled_at, -> { String }, optional: false, nullable: true

      field :started_at, -> { String }, optional: false, nullable: true

      field :completed_at, -> { String }, optional: false, nullable: true

      field :canceled_at, -> { String }, optional: false, nullable: true

      field :recipients_estimated, -> { Integer }, optional: false, nullable: true

      field :pause_reason, -> { String }, optional: false, nullable: true

      field :error, -> { Coss::Types::BroadcastError }, optional: false, nullable: true

      field :stats, -> { Coss::Types::BroadcastStats }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
