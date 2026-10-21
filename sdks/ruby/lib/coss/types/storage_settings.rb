# frozen_string_literal: true

module Coss
  module Types
    # What coss.com keeps of the API key's environment's emails. Emails keep the setting that applied when they were
    # sent.
    class StorageSettings < Internal::Types::Model
      field :object, -> { Coss::Types::StorageSettingsObject }, optional: false, nullable: false

      field :content_storage, -> { Coss::Types::StorageSettingsContentStorage }, optional: false, nullable: false

      field :updated_at, -> { String }, optional: false, nullable: true
    end
  end
end
