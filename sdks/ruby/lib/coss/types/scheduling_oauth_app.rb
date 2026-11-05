# frozen_string_literal: true

module Coss
  module Types
    class SchedulingOauthApp < Internal::Types::Model
      field :object, -> { Coss::Types::SchedulingOauthAppObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :provider, -> { Coss::Types::SchedulingOauthAppProvider }, optional: false, nullable: false

      field :client_id, -> { String }, optional: false, nullable: false

      field :tenant_id, -> { String }, optional: false, nullable: true

      field :redirect_uri, -> { String }, optional: false, nullable: true

      field :coss_callback_url, -> { String }, optional: false, nullable: false

      field :completion_url, -> { String }, optional: false, nullable: true

      field :zoom_event_url, -> { String }, optional: false, nullable: true

      field :scopes, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :status, -> { Coss::Types::SchedulingOauthAppStatus }, optional: false, nullable: false

      field :last_error_code, -> { String }, optional: false, nullable: true

      field :last_error_at, -> { String }, optional: false, nullable: true

      field :secret_expires_at, -> { String }, optional: false, nullable: true

      field :verified_at, -> { String }, optional: false, nullable: true

      field :connections, -> { Integer }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
