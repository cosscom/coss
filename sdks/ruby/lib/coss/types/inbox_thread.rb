# frozen_string_literal: true

module Coss
  module Types
    class InboxThread < Internal::Types::Model
      field :object, -> { Coss::Types::InboxThreadObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :inbox_id, -> { String }, optional: false, nullable: false

      field :subject, -> { String }, optional: false, nullable: true

      field :participants, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :message_count, -> { Integer }, optional: false, nullable: false

      field :preview, -> { String }, optional: false, nullable: true

      field :last_message_at, -> { String }, optional: false, nullable: false

      field :last_inbound_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :messages, -> { Internal::Types::Array[Coss::Types::InboxMessage] }, optional: false, nullable: false
    end
  end
end
