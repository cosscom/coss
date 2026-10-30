# frozen_string_literal: true

module Coss
  module Types
    class FormSubmissionList < Internal::Types::Model
      field :object, -> { Coss::Types::FormSubmissionListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::FormSubmission] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
