# frozen_string_literal: true

module Coss
  module Types
    class EmailEvent < Internal::Types::Model
      field :object, -> { Coss::Types::EmailEventObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :email_id, -> { String }, optional: false, nullable: false

      field :type, -> { Coss::Types::EmailEventType }, optional: false, nullable: false

      field :recipient, -> { String }, optional: false, nullable: true

      field :occurred_at, -> { String }, optional: false, nullable: false

      field :data, -> { Coss::Types::EmailEventData }, optional: false, nullable: false
    end
  end
end
