# frozen_string_literal: true

module Coss
  module Types
    class SmsTagsItem < Internal::Types::Model
      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false
    end
  end
end
