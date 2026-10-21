# frozen_string_literal: true

module Coss
  module Sms
    module Types
      class GetSmsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
