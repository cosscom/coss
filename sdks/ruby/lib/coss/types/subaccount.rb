# frozen_string_literal: true

module Coss
  module Types
    class Subaccount < Internal::Types::Model
      field :object, -> { Coss::Types::SubaccountObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :uid, -> { String }, optional: false, nullable: true

      field :name, -> { String }, optional: false, nullable: false

      field :metadata, -> { Internal::Types::Hash[String, String] }, optional: false, nullable: false

      field :status, -> { Coss::Types::SubaccountStatus }, optional: false, nullable: false

      field :quotas, -> { Coss::Types::SubaccountQuotas }, optional: false, nullable: false

      field :reputation, -> { Coss::Types::SubaccountReputation }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: false
    end
  end
end
