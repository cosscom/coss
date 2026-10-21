# frozen_string_literal: true

module Coss
  module Types
    class ReceivedSms < Internal::Types::Model
      field :object, -> { Coss::Types::ReceivedSmsObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false

      field :body, -> { String }, optional: false, nullable: false

      field :segments, -> { Integer }, optional: false, nullable: false

      field :keyword, -> { Coss::Types::ReceivedSmsKeyword }, optional: false, nullable: true

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
