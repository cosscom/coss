# frozen_string_literal: true

module Coss
  module Risk
    module Settings
      module Types
        # Changes the categories given: a score in (0, 1] sets the threshold, `null` removes it.
        class UpdateRiskSettingsRequestContentThresholds < Internal::Types::Model
          field :spam, -> { Integer }, optional: true, nullable: false

          field :phishing, -> { Integer }, optional: true, nullable: false

          field :malware, -> { Integer }, optional: true, nullable: false

          field :fraud, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
