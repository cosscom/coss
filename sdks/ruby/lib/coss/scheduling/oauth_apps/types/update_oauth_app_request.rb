# frozen_string_literal: true

module Coss
  module Scheduling
    module OauthApps
      module Types
        class UpdateOauthAppRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :client_secret, -> { String }, optional: true, nullable: false

          field :tenant_id, -> { String }, optional: true, nullable: false

          field :webhook_secret, -> { String }, optional: true, nullable: false

          field :redirect_uri, -> { String }, optional: true, nullable: false

          field :completion_url, -> { String }, optional: true, nullable: false

          field :secret_expires_at, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
