# frozen_string_literal: true

module Coss
  module Types
    # The signer who viewed, signed or declined; `null` otherwise.
    class SignRequestWebhookEventDataSigner < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: false

      field :client_ref, -> { String }, optional: false, nullable: true

      field :status, -> { Coss::Types::SignRequestWebhookEventDataSignerStatus }, optional: false, nullable: false
    end
  end
end
