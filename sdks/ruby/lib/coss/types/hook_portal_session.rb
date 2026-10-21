# frozen_string_literal: true

module Coss
  module Types
    class HookPortalSession < Internal::Types::Model
      field :object, -> { Coss::Types::HookPortalSessionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :application_id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :token, -> { String }, optional: false, nullable: false

      field :read_only, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false
    end
  end
end
