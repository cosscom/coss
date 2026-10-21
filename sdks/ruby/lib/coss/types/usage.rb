# frozen_string_literal: true

module Coss
  module Types
    class Usage < Internal::Types::Model
      field :object, -> { Coss::Types::UsageObject }, optional: false, nullable: false

      field :meter, -> { Coss::Types::UsageMeter }, optional: false, nullable: false

      field :dimension, -> { String }, optional: false, nullable: true

      field :environment_id, -> { String }, optional: false, nullable: true

      field :project_id, -> { String }, optional: false, nullable: true

      field :api_key_id, -> { String }, optional: false, nullable: true

      field :user_id, -> { String }, optional: false, nullable: true

      field :start, -> { String }, optional: false, nullable: false

      field :end_, -> { String }, optional: false, nullable: false, api_name: "end"

      field :quantity, -> { Integer }, optional: false, nullable: false
    end
  end
end
