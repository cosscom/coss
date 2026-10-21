# frozen_string_literal: true

module Coss
  module Hooks
    module Applications
      module Types
        class ListApplicationsRequest < Internal::Types::Model
          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
