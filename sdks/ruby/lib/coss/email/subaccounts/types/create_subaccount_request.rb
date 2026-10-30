# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      module Types
        class CreateSubaccountRequest < Internal::Types::Model
          field :name, -> { String }, optional: false, nullable: false

          field :uid, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :quotas, -> { Coss::Email::Subaccounts::Types::CreateSubaccountRequestQuotas }, optional: true, nullable: false
        end
      end
    end
  end
end
