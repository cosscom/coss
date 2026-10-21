# frozen_string_literal: true

module Coss
  module Email
    module Broadcasts
      module Types
        class UpdateBroadcastRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :audience_id, -> { String }, optional: true, nullable: false

          field :segment_id, -> { String }, optional: true, nullable: false

          field :topic, -> { String }, optional: true, nullable: false

          field :from, -> { String }, optional: true, nullable: false

          field :reply_to, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :subject, -> { String }, optional: true, nullable: false

          field :preview_text, -> { String }, optional: true, nullable: false

          field :html, -> { String }, optional: true, nullable: false

          field :text, -> { String }, optional: true, nullable: false

          field :tracking, -> { Coss::Email::Broadcasts::Types::UpdateBroadcastRequestTracking }, optional: true, nullable: false

          field :rate_per_second, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
