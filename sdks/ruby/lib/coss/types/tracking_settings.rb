# frozen_string_literal: true

module Coss
  module Types
    # Open and click tracking and one-click unsubscribe settings of the API key's environment. For each of `opens`,
    # `clicks` and `unsubscribe`, a send's own `tracking` wins, then its category's rule, then `default` (the
    # environment default; `null` when none is set), then off.
    class TrackingSettings < Internal::Types::Model
      field :object, -> { Coss::Types::TrackingSettingsObject }, optional: false, nullable: false

      field :default, -> { Coss::Types::TrackingRule }, optional: false, nullable: true

      field :categories, -> { Internal::Types::Array[Coss::Types::TrackingRule] }, optional: false, nullable: false
    end
  end
end
