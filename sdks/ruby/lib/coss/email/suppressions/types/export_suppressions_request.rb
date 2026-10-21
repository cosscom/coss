# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        class ExportSuppressionsRequest < Internal::Types::Model
          field :scope, -> { Coss::Types::ExportSuppressionsRequestScope }, optional: true, nullable: false

          field :reason, -> { Coss::Email::Suppressions::Types::ExportSuppressionsRequestReason }, optional: true, nullable: false
        end
      end
    end
  end
end
