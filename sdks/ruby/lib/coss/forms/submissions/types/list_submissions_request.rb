# frozen_string_literal: true

module Coss
  module Forms
    module Submissions
      module Types
        class ListSubmissionsRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :status, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
