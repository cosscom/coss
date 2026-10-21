# frozen_string_literal: true

module Coss
  module Types
    class SmsNumber < Internal::Types::Model
      field :object, -> { Coss::Types::SmsNumberObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :phone_number, -> { String }, optional: false, nullable: false

      field :kind, -> { Coss::Types::SmsNumberKind }, optional: false, nullable: false

      field :country, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SmsNumberStatus }, optional: false, nullable: false

      field :registration_status, -> { Coss::Types::SmsNumberRegistrationStatus }, optional: false, nullable: true

      field :can_send, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :receives_here, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
