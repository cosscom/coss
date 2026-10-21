# frozen_string_literal: true

module Coss
  module Email
    module Contacts
      module Types
        class UpsertContactRequest < Internal::Types::Model
          field :email, -> { String }, optional: false, nullable: false

          field :first_name, -> { String }, optional: true, nullable: false

          field :last_name, -> { String }, optional: true, nullable: false

          field :properties, -> { Internal::Types::Hash[String, Coss::Email::Contacts::Types::UpsertContactRequestPropertiesValue] }, optional: true, nullable: false

          field :status, -> { Coss::Email::Contacts::Types::UpsertContactRequestStatus }, optional: true, nullable: false

          field :audience_ids, -> { Internal::Types::Array[String] }, optional: true, nullable: false

          field :topics, -> { Internal::Types::Array[Coss::Email::Contacts::Types::UpsertContactRequestTopicsItem] }, optional: true, nullable: false

          field :double_opt_in, -> { Internal::Types::Boolean }, optional: true, nullable: false
        end
      end
    end
  end
end
