# frozen_string_literal: true

module Coss
  module Types
    class VerificationSend < Internal::Types::Model
      field :channel, -> { Coss::Types::VerificationSendChannel }, optional: false, nullable: false

      field :route, -> { Coss::Types::VerificationSendRoute }, optional: false, nullable: false

      field :sms_id, -> { String }, optional: false, nullable: true

      field :email_id, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
