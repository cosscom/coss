# frozen_string_literal: true

module Coss
  module Types
    module ContactSource
      extend Coss::Internal::Types::Enum

      API = "api"
      DASHBOARD = "dashboard"
      IMPORT = "import"
      PREFERENCE_CENTER = "preference_center"
      FORM = "form"
    end
  end
end
