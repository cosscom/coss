# frozen_string_literal: true

module Coss
  module Types
    class SignBuilderSession < Internal::Types::Model
      field :object, -> { Coss::Types::SignBuilderSessionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :template_id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :token, -> { String }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false
    end
  end
end
