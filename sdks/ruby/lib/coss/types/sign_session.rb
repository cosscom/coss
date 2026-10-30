# frozen_string_literal: true

module Coss
  module Types
    class SignSession < Internal::Types::Model
      field :object, -> { Coss::Types::SignSessionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :request_id, -> { String }, optional: false, nullable: false

      field :signer_id, -> { String }, optional: false, nullable: false

      field :url, -> { String }, optional: false, nullable: false

      field :token, -> { String }, optional: false, nullable: false

      field :expires_at, -> { String }, optional: false, nullable: false
    end
  end
end
