# frozen_string_literal: true

module Coss
  module Hooks
    module Applications
      module Types
        class DeleteApplicationsRequest < Internal::Types::Model
          field :application, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
