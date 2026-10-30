# frozen_string_literal: true

module Coss
  module Types
    class SignRequest < Internal::Types::Model
      field :object, -> { Coss::Types::SignRequestObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SignRequestStatus }, optional: false, nullable: false

      field :title, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: true

      field :signing_order, -> { Coss::Types::SignRequestSigningOrder }, optional: false, nullable: false

      field :documents, -> { Internal::Types::Array[Coss::Types::SignRequestDocumentsItem] }, optional: false, nullable: false

      field :signers, -> { Internal::Types::Array[Coss::Types::SignSigner] }, optional: false, nullable: false

      field :fields, -> { Internal::Types::Array[Coss::Types::SignField] }, optional: false, nullable: false

      field :metadata, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :reminder_interval_days, -> { Integer }, optional: false, nullable: true

      field :expires_at, -> { String }, optional: false, nullable: true

      field :expired_at, -> { String }, optional: false, nullable: true

      field :sent_at, -> { String }, optional: false, nullable: true

      field :completed_at, -> { String }, optional: false, nullable: true

      field :canceled_at, -> { String }, optional: false, nullable: true

      field :declined_at, -> { String }, optional: false, nullable: true

      field :signed_document, -> { Coss::Types::SignRequestSignedDocument }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
