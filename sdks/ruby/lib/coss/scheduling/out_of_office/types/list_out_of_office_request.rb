# frozen_string_literal: true

module Coss
  module Scheduling
    module OutOfOffice
      module Types
        class ListOutOfOfficeRequest < Internal::Types::Model
          field :limit, -> { Integer }, optional: true, nullable: false

          field :after, -> { String }, optional: true, nullable: false

          field :host, -> { String }, optional: true, nullable: false

          field :start_after, -> { String }, optional: true, nullable: false

          field :start_before, -> { String }, optional: true, nullable: false

          field :group, -> { String }, optional: true, nullable: false
        end
      end
    end
  end
end
