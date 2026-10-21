# frozen_string_literal: true

module Coss
  module Types
    class AuditEvent < Internal::Types::Model
      field :object, -> { Coss::Types::AuditEventObject }, optional: false, nullable: false

      field :id, -> { String }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false

      field :actor_type, -> { Coss::Types::AuditActorType }, optional: false, nullable: false

      field :actor_id, -> { String }, optional: false, nullable: true

      field :actor_label, -> { String }, optional: false, nullable: false

      field :action, -> { String }, optional: false, nullable: false

      field :target_type, -> { String }, optional: false, nullable: true

      field :target_id, -> { String }, optional: false, nullable: true

      field :target_label, -> { String }, optional: false, nullable: true

      field :project_id, -> { String }, optional: false, nullable: true

      field :environment_id, -> { String }, optional: false, nullable: true

      field :metadata, -> { Internal::Types::Hash[String, Object] }, optional: false, nullable: false

      field :client_ip, -> { String }, optional: false, nullable: true

      field :user_agent, -> { String }, optional: false, nullable: true
    end
  end
end
