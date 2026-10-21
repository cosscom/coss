# frozen_string_literal: true

module Coss
  module Types
    # Per category, the model's probability (0-1) that the content belongs to it. Scores are not calibrated: pick
    # thresholds by looking at your own traffic.
    class RiskContentSignals < Internal::Types::Model
      field :spam, -> { Integer }, optional: false, nullable: false

      field :phishing, -> { Integer }, optional: false, nullable: false

      field :malware, -> { Integer }, optional: false, nullable: false

      field :fraud, -> { Integer }, optional: false, nullable: false
    end
  end
end
