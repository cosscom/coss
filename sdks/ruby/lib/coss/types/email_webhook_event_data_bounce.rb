# frozen_string_literal: true

module Coss
  module Types
    class EmailWebhookEventDataBounce < Internal::Types::Model
      field :type, -> { Coss::Types::EmailWebhookEventDataBounceType }, optional: false, nullable: false

      field :sub_type, -> { String }, optional: false, nullable: false

      field :diagnostic_code, -> { String }, optional: false, nullable: true
    end
  end
end
