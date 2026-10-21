# frozen_string_literal: true

module Coss
  module Types
    class RiskEmailCheck < Internal::Types::Model
      field :object, -> { Coss::Types::RiskEmailCheckObject }, optional: false, nullable: false

      field :email, -> { String }, optional: false, nullable: false

      field :valid, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :domain, -> { String }, optional: false, nullable: true

      field :canonical, -> { String }, optional: false, nullable: true

      field :disposable, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :deliverability, -> { Coss::Types::RiskEmailCheckDeliverability }, optional: false, nullable: false

      field :role_account, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :free_provider, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :suggestion, -> { String }, optional: false, nullable: true

      field :domain_age_days, -> { Integer }, optional: false, nullable: true

      field :degraded, -> { Internal::Types::Array[Coss::Types::RiskEmailCheckDegradedItem] }, optional: false, nullable: false
    end
  end
end
