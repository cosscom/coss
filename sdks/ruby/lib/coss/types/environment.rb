# frozen_string_literal: true

module Coss
  module Types
    # The environment an API key belongs to, with its project and organization.
    class Environment < Internal::Types::Model
      field :object, -> { Coss::Types::EnvironmentObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :slug, -> { String }, optional: false, nullable: false

      field :mode, -> { Coss::Types::EnvironmentMode }, optional: false, nullable: false

      field :project, -> { Coss::Types::EnvironmentProject }, optional: false, nullable: false

      field :organization, -> { Coss::Types::EnvironmentOrganization }, optional: false, nullable: false

      field :api_key, -> { Coss::Types::EnvironmentAPIKey }, optional: false, nullable: false
    end
  end
end
