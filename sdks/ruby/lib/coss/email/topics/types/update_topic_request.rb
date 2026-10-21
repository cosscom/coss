# frozen_string_literal: true

module Coss
  module Email
    module Topics
      module Types
        class UpdateTopicRequest < Internal::Types::Model
          field :id, -> { String }, optional: false, nullable: false

          field :name, -> { String }, optional: true, nullable: false

          field :description, -> { String }, optional: true, nullable: false

          field :default_subscription, -> { Coss::Email::Topics::Types::UpdateTopicRequestDefaultSubscription }, optional: true, nullable: false

          field :visibility, -> { Coss::Email::Topics::Types::UpdateTopicRequestVisibility }, optional: true, nullable: false

          field :position, -> { Integer }, optional: true, nullable: false
        end
      end
    end
  end
end
