# frozen_string_literal: true

module Coss
  module Types
    class Sms < Internal::Types::Model
      field :object, -> { Coss::Types::SmsObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :from, -> { String }, optional: false, nullable: false

      field :to, -> { String }, optional: false, nullable: false

      field :body, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::SmsStatus }, optional: false, nullable: false

      field :segments, -> { Integer }, optional: false, nullable: false

      field :encoding, -> { Coss::Types::SmsEncoding }, optional: false, nullable: false

      field :country, -> { String }, optional: false, nullable: false

      field :tags, -> { Internal::Types::Array[Coss::Types::SmsTagsItem] }, optional: false, nullable: false

      field :failure, -> { Coss::Types::SmsFailure }, optional: false, nullable: true

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :scheduled_at, -> { String }, optional: false, nullable: true

      field :sent_at, -> { String }, optional: false, nullable: true

      field :delivered_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
