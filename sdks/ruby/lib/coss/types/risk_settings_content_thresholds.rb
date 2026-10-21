# frozen_string_literal: true

module Coss
  module Types
    # Per content category, the score at which `content.<category>` fires; `null`: never (the score is still in
    # `signals.content` for your rules).
    class RiskSettingsContentThresholds < Internal::Types::Model
      field :spam, -> { Integer }, optional: false, nullable: true

      field :phishing, -> { Integer }, optional: false, nullable: true

      field :malware, -> { Integer }, optional: false, nullable: true

      field :fraud, -> { Integer }, optional: false, nullable: true
    end
  end
end
