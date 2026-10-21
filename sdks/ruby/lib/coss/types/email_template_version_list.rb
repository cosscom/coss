# frozen_string_literal: true

module Coss
  module Types
    class EmailTemplateVersionList < Internal::Types::Model
      field :object, -> { Coss::Types::EmailTemplateVersionListObject }, optional: false, nullable: false

      field :data, -> { Internal::Types::Array[Coss::Types::EmailTemplateVersion] }, optional: false, nullable: false

      field :has_more, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
