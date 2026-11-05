# frozen_string_literal: true

module Coss
  module Types
    class CreateOauthAppRequestGoogle < Internal::Types::Model
      field :client_id, -> { String }, optional: false, nullable: false

      field :client_secret, -> { String }, optional: false, nullable: false

      field :redirect_uri, -> { String }, optional: true, nullable: false

      field :completion_url, -> { String }, optional: true, nullable: false

      field :secret_expires_at, -> { String }, optional: true, nullable: false
    end
  end
end
