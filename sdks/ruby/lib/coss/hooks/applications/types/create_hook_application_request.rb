# frozen_string_literal: true

module Coss
  module Hooks
    module Applications
      module Types
        class CreateHookApplicationRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :uid, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false
        end
      end
    end
  end
end
