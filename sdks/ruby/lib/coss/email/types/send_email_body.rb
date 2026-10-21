# frozen_string_literal: true

module Coss
  module Email
    module Types
      class SendEmailBody < Internal::Types::Model
        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "Idempotency-Key"

        field :body, -> { Coss::Types::SendEmailRequest }, optional: false, nullable: false
      end
    end
  end
end
