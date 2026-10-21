# frozen_string_literal: true

module Coss
  module Types
    class SmsSuppressionCheck < Internal::Types::Model
      field :object, -> { Coss::Types::SmsSuppressionCheckObject }, optional: false, nullable: false

      field :phone_number, -> { String }, optional: false, nullable: false

      field :suppressed, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :suppression, -> { Coss::Types::SmsSuppressionCheckSuppression }, optional: false, nullable: true
    end
  end
end
