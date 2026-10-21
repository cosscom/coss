# frozen_string_literal: true

module Coss
  module Sms
    module Types
      class ListSmsRequest < Internal::Types::Model
        field :to, -> { String }, optional: true, nullable: false

        field :status, -> { String }, optional: true, nullable: false

        field :created_after, -> { String }, optional: true, nullable: false

        field :created_before, -> { String }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
