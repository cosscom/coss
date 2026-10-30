# frozen_string_literal: true

module Coss
  module Types
    class Inbox < Internal::Types::Model
      field :object, -> { Coss::Types::InboxObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :address, -> { String }, optional: false, nullable: false

      field :username, -> { String }, optional: false, nullable: false

      field :domain, -> { String }, optional: false, nullable: false

      field :kind, -> { Coss::Types::InboxKind }, optional: false, nullable: false

      field :display_name, -> { String }, optional: false, nullable: true

      field :client_id, -> { String }, optional: false, nullable: true

      field :can_send, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :sandbox, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
