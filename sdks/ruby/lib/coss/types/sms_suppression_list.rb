# frozen_string_literal: true

module Coss
  module Types
    class SmsSuppressionList < Internal::Types::Model
      field :object, -> { Coss::Types::SmsSuppressionListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::SmsSuppression] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
