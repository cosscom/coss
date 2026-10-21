# frozen_string_literal: true

module Coss
  module Email
    module Storage
      module Types
        class UpdateStorageSettingsRequest < Internal::Types::Model
          field :content_storage, -> { Coss::Email::Storage::Types::UpdateStorageSettingsRequestContentStorage }, optional: false, nullable: false
        end
      end
    end
  end
end
