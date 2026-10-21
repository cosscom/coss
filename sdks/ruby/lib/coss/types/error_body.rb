# frozen_string_literal: true

module Coss
  module Types
    class ErrorBody < Internal::Types::Model
      field :type, -> { Coss::Types::ErrorBodyType }, optional: false, nullable: false

      field :code, -> { String }, optional: false, nullable: false

      field :message, -> { String }, optional: false, nullable: false

      field :param, -> { String }, optional: true, nullable: false

      field :issues, -> { Internal::Types::Array[Coss::Types::ErrorBodyIssuesItem] }, optional: true, nullable: false

      field :request_id, -> { String }, optional: false, nullable: false
    end
  end
end
