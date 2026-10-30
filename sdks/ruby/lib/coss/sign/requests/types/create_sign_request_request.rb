# frozen_string_literal: true

module Coss
  module Sign
    module Requests
      module Types
        class CreateSignRequestRequest < Internal::Types::Model
          field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

          field :title, -> { String }, optional: false, nullable: false

          field :message, -> { String }, optional: true, nullable: false

          field :documents, -> { Internal::Types::Array[Coss::Sign::Requests::Types::CreateSignRequestRequestDocumentsItem] }, optional: false, nullable: false

          field :signers, -> { Internal::Types::Array[Coss::Sign::Requests::Types::CreateSignRequestRequestSignersItem] }, optional: false, nullable: false

          field :signing_order, -> { Coss::Sign::Requests::Types::CreateSignRequestRequestSigningOrder }, optional: true, nullable: false

          field :expires_at, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :reminder_interval_days, -> { Integer }, optional: true, nullable: false

          field :send_, -> { Internal::Types::Boolean }, optional: true, nullable: false, api_name: "send"
        end
      end
    end
  end
end
