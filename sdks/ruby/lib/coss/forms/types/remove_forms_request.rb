# frozen_string_literal: true

module Coss
  module Forms
    module Types
      class RemoveFormsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
