# frozen_string_literal: true

module Coss
  module Email
    module Suppressions
      module Types
        # Defaults to `*` (every email). Pass a category, e.g. "marketing", to only skip those.
        class CreateSuppressionRequestScope < Internal::Types::Model
          extend Coss::Internal::Types::Union

          member -> { Coss::Email::Suppressions::Types::CreateSuppressionRequestScopeZero }

          member -> { Coss::Email::Suppressions::Types::CreateSuppressionRequestScopeOne }

          member -> { String }
        end
      end
    end
  end
end
