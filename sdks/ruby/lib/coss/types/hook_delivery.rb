# frozen_string_literal: true

module Coss
  module Types
    class HookDelivery < Internal::Types::Model
      field :object, -> { Coss::Types::HookDeliveryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :application_id, -> { String }, optional: false, nullable: false

      field :message_id, -> { String }, optional: false, nullable: false

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::HookDeliveryStatus }, optional: false, nullable: false

      field :attempt_count, -> { Integer }, optional: false, nullable: false

      field :next_attempt_at, -> { String }, optional: false, nullable: true

      field :last_status_code, -> { Integer }, optional: false, nullable: true

      field :last_error, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :finished_at, -> { String }, optional: false, nullable: true
    end
  end
end
