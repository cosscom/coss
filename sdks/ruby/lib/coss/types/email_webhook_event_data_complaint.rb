# frozen_string_literal: true

module Coss
  module Types
    class EmailWebhookEventDataComplaint < Internal::Types::Model
      field :feedback_type, -> { String }, optional: false, nullable: true

      field :sub_type, -> { String }, optional: false, nullable: true
    end
  end
end
