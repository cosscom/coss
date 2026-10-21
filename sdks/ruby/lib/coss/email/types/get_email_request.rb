# frozen_string_literal: true

module Coss
  module Email
    module Types
      class GetEmailRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
