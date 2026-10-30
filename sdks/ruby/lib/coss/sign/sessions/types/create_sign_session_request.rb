# frozen_string_literal: true

module Coss
  module Sign
    module Sessions
      module Types
        class CreateSignSessionRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :signer_id, -> { String }, optional: false, nullable: false

          field :expires_in, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
