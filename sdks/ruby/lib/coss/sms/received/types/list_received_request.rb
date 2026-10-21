# frozen_string_literal: true

module Coss
  module Sms
    module Received
      module Types
        class ListReceivedRequest < Internal::Types::Model
          field :from, -> { String }, optional: true, nullable: false

          field :to, -> { String }, optional: true, nullable: false

          field :created_after, -> { String }, optional: true, nullable: false

          field :created_before, -> { String }, optional: true, nullable: false

          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
