# frozen_string_literal: true

module Coss
  module Sign
    module Templates
      module Types
        class CreateSignRequestFromTemplateRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :title, -> { String }, optional: true, nullable: false

          field :message, -> { String }, optional: true, nullable: false

          field :signers, -> { Internal::Types::Array[Coss::Sign::Templates::Types::CreateSignRequestFromTemplateRequestSignersItem] }, optional: false, nullable: false

          field :merge_fields, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :signing_order, -> { Coss::Sign::Templates::Types::CreateSignRequestFromTemplateRequestSigningOrder }, optional: true, nullable: false

          field :expires_at, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :reminder_interval_days, -> { Integer }, optional: true, nullable: false

          field :send_, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "send"
        end
      end
    end
  end
end
