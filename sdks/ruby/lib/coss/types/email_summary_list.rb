# frozen_string_literal: true

module Coss
  module Types
    class EmailSummaryList < Internal::Types::Model
      field :object, -> { Coss::Types::EmailSummaryListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::EmailSummary] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
