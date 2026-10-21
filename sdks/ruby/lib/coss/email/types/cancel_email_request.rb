# frozen_string_literal: true

module Coss
  module Email
    module Types
      class CancelEmailRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
