# frozen_string_literal: true

module Coss
  module Email
    module Types
      class SendEmailBatchRequest < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :emails, -> { Internal::Types::Array[Coss::Types::SendEmailRequest] }, optional: false, nullable: false
      end
    end
  end
end
