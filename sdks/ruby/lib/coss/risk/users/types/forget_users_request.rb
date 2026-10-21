# frozen_string_literal: true

module Coss
  module Risk
    module Users
      module Types
        class ForgetUsersRequest < Internal::Types::Model
          field :user_id, -> { String }, optional: false, nullable: false
        end
      end
    end
  end
end
