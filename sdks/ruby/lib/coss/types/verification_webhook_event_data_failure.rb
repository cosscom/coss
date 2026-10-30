# frozen_string_literal: true

module Coss
  module Types
    class VerificationWebhookEventDataFailure < Internal::Types::Model
      field :code, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false
    end
  end
end
