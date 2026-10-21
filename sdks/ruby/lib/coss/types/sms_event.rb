# frozen_string_literal: true

module Coss
  module Types
    class SmsEvent < Internal::Types::Model
      field :object, -> { Coss::Types::SmsEventObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :sms_id, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::SmsEventType }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::SmsEventData }, optional: false, nullable: false
    end
  end
end
