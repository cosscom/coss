# frozen_string_literal: true

module Coss
  module Email
    module Types
      class ListEmailRequest < Internal::Types::Model
        field :to, -> { String }, optional: true, nullable: false

        field :recipient_status, -> { String }, optional: true, nullable: false

        field :status, -> { String }, optional: true, nullable: false

        field :q, -> { String }, optional: true, nullable: false

        field :category, -> { String }, optional: true, nullable: false

        field :batch_id, -> { String }, optional: true, nullable: false

        field :created_after, -> { String }, optional: true, nullable: false

        field :created_before, -> { String }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
