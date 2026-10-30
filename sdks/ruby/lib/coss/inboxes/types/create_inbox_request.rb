# frozen_string_literal: true

module Coss
  module Inboxes
    module Types
      class CreateInboxRequest < Internal::Types::Model
        field :username, -> { String }, optional: true, nullable: false

        field :domain, -> { String }, optional: true, nullable: false

        field :display_name, -> { String }, optional: true, nullable: false

        field :client_id, -> { String }, optional: true, nullable: false
      end
    end
  end
end
