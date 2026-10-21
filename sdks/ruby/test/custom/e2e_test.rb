# frozen_string_literal: true

# Hand-written (listed in .fernignore): end to end against the API's test app.
#
#   bun run --cwd apps/api serve:test  # prints {base_url, sandbox_key, live_key, live_from}
#   COSS_E2E='<that JSON>' bundle exec rake test
#
# Skipped without COSS_E2E.

require "json"
require_relative "../test_helper"
require "minitest/autorun"

class E2eTest < Minitest::Test
  def setup
    skip "COSS_E2E is not set (see the file comment)" if ENV.fetch("COSS_E2E", "").empty?
    server = JSON.parse(ENV.fetch("COSS_E2E"))
    @coss = Coss::Client.new(api_key: server["sandbox_key"], base_url: server["base_url"])
  end

  def test_send_get_and_list
    email = @coss.email.send_(from: "Acme <hello@acme.test>", to: ["ada@example.com"], subject: "Hello from Ruby",
                              text: "It works.")

    assert email.id.start_with?("email_")
    assert_equal email.id, @coss.email.get(id: email.id).id
    assert_equal 1, @coss.email.list(limit: 1).data.size
  end

  def test_errors
    invalid = assert_raises(Coss::Errors::ClientError) do
      @coss.email.send_(from: "not an address", to: ["ada@example.com"], text: "Hi")
    end
    assert_equal 422, invalid.code
    not_found = assert_raises(Coss::Errors::ClientError) { @coss.email.get(id: "email_01k00000000000000000000000") }
    assert_equal 404, not_found.code
  end

  def test_csv_exports
    assert @coss.email.suppressions.export.start_with?("address,scope,reason,")
    assert @coss.email.contacts.export.start_with?("email,")
  end

  def test_reads_parse
    @coss.environment.get
    @coss.reputation.get
    @coss.billing.get
    @coss.logs.list
    @coss.audit_events.list
    @coss.domains.list
    @coss.webhook_endpoints.list
    @coss.email.suppressions.list
    @coss.email.templates.list
    @coss.email.contacts.list
    @coss.email.tracking.get
    @coss.hooks.applications.list
    @coss.risk.settings.get
    @coss.risk.rules.list
  end
end
