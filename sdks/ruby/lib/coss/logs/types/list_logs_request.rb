# frozen_string_literal: true

module Coss
  module Logs
    module Types
      class ListLogsRequest < Internal::Types::Model
        field :from, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false

        field :source, -> { String }, optional: true, nullable: false

        field :level, -> { String }, optional: true, nullable: false

        field :type, -> { String }, optional: true, nullable: false

        field :status, -> { String }, optional: true, nullable: false

        field :method_, -> { String }, optional: true, nullable: false, api_name: "method"

        field :route, -> { String }, optional: true, nullable: false

        field :api_key_id, -> { String }, optional: true, nullable: false

        field :request_id, -> { String }, optional: true, nullable: false

        field :resource_id, -> { String }, optional: true, nullable: false

        field :q, -> { String }, optional: true, nullable: false

        field :limit, -> { Integer }, optional: true, nullable: false

        field :after, -> { String }, optional: true, nullable: false
      end
    end
  end
end
