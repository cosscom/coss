# frozen_string_literal: true

module Coss
  module Hooks
    module Endpoints
      module Types
        class CreateHookEndpointRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :url, -> { String }, optional: false, nullable: false

          field :description, -> { String }, optional: true, nullable: false

          field :filter_types, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :secret, -> { String }, optional: true, nullable: false

          field :rate_limit_per_second, -> { Integer }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :enabled, -> { Internal::Types::Boolean }, optional: true, nullable: false
        end
      end
    end
  end
end
