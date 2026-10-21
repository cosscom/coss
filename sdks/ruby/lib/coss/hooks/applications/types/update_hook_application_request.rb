# frozen_string_literal: true

module Coss
  module Hooks
    module Applications
      module Types
        class UpdateHookApplicationRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :uid, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false
        end
      end
    end
  end
end
