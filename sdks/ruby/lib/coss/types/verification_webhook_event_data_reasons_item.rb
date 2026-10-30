# frozen_string_literal: true

module Coss
  module Types
    # A fraud guard reason (see the docs' list).
    class VerificationWebhookEventDataReasonsItem < Internal::Types::Model
      field :code, -> { String }, optional: false, nullable: false

      field :value, -> { Integer }, optional: true, nullable: false
    end
  end
end
