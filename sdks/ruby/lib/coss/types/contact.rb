# frozen_string_literal: true

module Coss
  module Types
    class Contact < Internal::Types::Model
      field :object, -> { Coss::Types::ContactObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: false

      field :first_name, -> { String }, optional: false, nullable: true

      field :last_name, -> { String }, optional: false, nullable: true

      field :status, -> { Coss::Types::ContactStatus }, optional: false, nullable: false

      field :properties, -> { Internal::Types::Hash[String, Coss::Types::ContactPropertiesValue] }, optional: false, nullable: false

      field :source, -> { Coss::Types::ContactSource }, optional: false, nullable: false

      field :subscribed_at, -> { String }, optional: false, nullable: true

      field :unsubscribed_at, -> { String }, optional: false, nullable: true

      field :confirmed_at, -> { String }, optional: false, nullable: true

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
