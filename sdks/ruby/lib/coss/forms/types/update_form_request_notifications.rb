# frozen_string_literal: true

module Coss
  module Forms
    module Types
      class UpdateFormRequestNotifications < Internal::Types::Model
        field :recipients, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :from, -> { String }, optional: true, nullable: false
      end
    end
  end
end
