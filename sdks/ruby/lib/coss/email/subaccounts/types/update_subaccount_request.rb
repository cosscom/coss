# frozen_string_literal: true

module Coss
  module Email
    module Subaccounts
      module Types
        class UpdateSubaccountRequest < Internal::Types::Model
          field :subaccount, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :uid, -> { String }, optional: true, nullable: false

          field :metadata, -> { Internal::Types::Hash[String, String] }, optional: true, nullable: false

          field :status, -> { Coss::Email::Subaccounts::Types::UpdateSubaccountRequestStatus }, optional: true, nullable: false

          field :quotas, -> { Coss::Email::Subaccounts::Types::UpdateSubaccountRequestQuotas }, optional: true, nullable: false
        end
      end
    end
  end
end
