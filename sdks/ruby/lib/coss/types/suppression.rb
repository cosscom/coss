# frozen_string_literal: true

module Coss
  module Types
    class Suppression < Internal::Types::Model
      field :object, -> { Coss::Types::SuppressionObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :address, -> { String }, optional: false, nullable: false

      field :scope, -> { String }, optional: false, nullable: false

      field :reason, -> { Coss::Types::SuppressionReason }, optional: false, nullable: false

      field :email_id, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false
    end
  end
end
