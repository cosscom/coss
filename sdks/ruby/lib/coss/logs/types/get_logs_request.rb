# frozen_string_literal: true

module Coss
  module Logs
    module Types
      class GetLogsRequest < Internal::Types::Model
        field :id, -> { String }, optional: false, nullable: false
      end
    end
  end
end
