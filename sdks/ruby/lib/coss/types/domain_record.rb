# frozen_string_literal: true

module Coss
  module Types
    class DomainRecord < Internal::Types::Model
      field :purpose, -> { Coss::Types::DomainRecordPurpose }, optional: false, nullable: false

      field :type, -> { Coss::Types::DomainRecordType }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :value, -> { String }, optional: false, nullable: false

      field :priority, -> { Integer }, optional: false, nullable: true

      field :required, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :status, -> { Coss::Types::DomainRecordStatus }, optional: false, nullable: false

      field :found, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
