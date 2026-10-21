# frozen_string_literal: true

module Coss
  module Email
    module Types
      class RescheduleEmailRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false

        field :scheduled_at, -> { String }, optional: false, nullable: false
      end
    end
  end
end
