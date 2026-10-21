# frozen_string_literal: true

module Coss
  module Sms
    module Types
      class SendSmsRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :from, -> { String }, optional: false, nullable: false

        field :to, -> { String }, optional: false, nullable: false

        field :body, -> { String }, optional: false, nullable: false

        field :tags, -> { Internal::Types::Array[Coss::Sms::Types::SendSmsRequestTagsItem] }, optional: true, nullable: false

        field :scheduled_at, -> { String }, optional: true, nullable: false
      end
    end
  end
end
