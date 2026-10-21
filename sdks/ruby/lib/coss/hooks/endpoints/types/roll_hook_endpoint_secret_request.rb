# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        class RollHookEndpointSecretRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :endpoint_id, -> { String }, optional: false, nullable: false

          field :previous_secret_expires_in, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
