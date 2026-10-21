# frozen_string_literal: true

module Coss
  module Sms
    module Types
      class CancelSmsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
