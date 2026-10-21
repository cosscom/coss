# frozen_string_literal: true

module Coss
  module Types
    # Only for `email.clicked`.
    class EmailEventDataClick < Internal::Types::Model
      field :url, -> { String }, optional: false, nullable: false

      field :link_position, -> { Integer }, optional: false, nullable: false

      field :user_agent, -> { String }, optional: false, nullable: true
    end
  end
end
