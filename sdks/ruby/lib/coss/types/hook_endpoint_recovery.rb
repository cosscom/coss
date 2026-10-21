# frozen_string_literal: true

module Coss
  module Types
    class HookEndpointRecovery < Internal::Types::Model
      field :object, -> { Coss::Types::HookEndpointRecoveryObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :endpoint_id, -> { String }, optional: false, nullable: false

      field :since, -> { String }, optional: false, nullable: false

      field :until_, -> { String }, optional: false, nullable: false, api_name: "until"

      field :status, -> { Coss::Types::HookEndpointRecoveryStatus }, optional: false, nullable: false

      field :requeued, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :completed_at, -> { String }, optional: false, nullable: true
    end
  end
end
