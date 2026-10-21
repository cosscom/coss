# frozen_string_literal: true

module Coss
  module Types
    class ContactWebhookEventDataContact < Internal::Types::Model
      field :id, -> { String }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: false

      field :status, -> { Coss::Types::ContactWebhookEventDataContactStatus }, optional: false, nullable: false
    end
  end
end
