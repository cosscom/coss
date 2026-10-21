# frozen_string_literal: true

module Coss
  module Email
    module Topics
      module Types
        class CreateTopicRequest < Internal::Types::Model
          field :key, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: false, nullable: false

          field :description, -> { String }, optional: true, nullable: false

          field :default_subscription, -> { Coss::Email::Topics::Types::CreateTopicRequestDefaultSubscription }, optional: false, nullable: false

          field :visibility, -> { Coss::Email::Topics::Types::CreateTopicRequestVisibility }, optional: true, nullable: false

          field :position, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
