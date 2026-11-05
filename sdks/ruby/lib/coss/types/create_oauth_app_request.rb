# frozen_string_literal: true

module Coss
  module Types
    class CreateOauthAppRequest < Internal::Types::Model
      extend Coss::Internal::Types::Union

      discriminant :provider

      member -> { Coss::Types::CreateOauthAppRequestGoogle }, key: "GOOGLE"

      member -> { Coss::Types::CreateOauthAppRequestMicrosoft }, key: "MICROSOFT"

      member -> { Coss::Types::CreateOauthAppRequestZoom }, key: "ZOOM"
    end
  end
end
