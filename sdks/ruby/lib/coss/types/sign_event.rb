# frozen_string_literal: true

module Coss
  module Types
    class SignEvent < Internal::Types::Model
      field :object, -> { Coss::Types::SignEventObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :sequence, -> { Integer }, optional: false, nullable: false

      field :type, -> { Coss::Types::SignEventType }, optional: false, nullable: false

      field :signer_id, -> { String }, optional: false, nullable: true

      field :actor, -> { Coss::Types::SignEventActor }, optional: false, nullable: false

      field :ip_address, -> { String }, optional: false, nullable: true

      field :user_agent, -> { String }, optional: false, nullable: true

      field :details, -> { Coss::Types::SignEventDetails }, optional: false, nullable: false

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :previous_hash, -> { String }, optional: false, nullable: true

      field :hash_, -> { String }, optional: false, nullable: false, api_name: "hash"
    end
  end
end
