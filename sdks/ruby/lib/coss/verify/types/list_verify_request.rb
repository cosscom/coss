# frozen_string_literal: true

module Coss
  module Verify
    module Types
      class ListVerifyRequest < Internal::Types::Model
        field :to, -> { String }, optional: true, nullable: false

        field :status, -> { Coss::Verify::Types::ListVerifyRequestStatus }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
