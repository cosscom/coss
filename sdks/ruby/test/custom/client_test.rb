# frozen_string_literal: true

# Hand-written (listed in .fernignore): the generated client's request behaviour (headers,
# retries, idempotency keys).

require "json"
require_relative "../test_helper"
require "minitest/autorun"
require "webmock"

class ClientBehaviourTest < Minitest::Test
  include WebMock::API

  BASE = "https://api.coss.test"
  ROOT = File.expand_path("../../../..", __dir__)
  EMAIL = JSON.parse(File.read(File.join(ROOT, "apps/api/openapi.json")))
              .dig("components", "schemas", "Email", "examples", 0)
  ERROR = { error: { type: "api_error", code: "x", message: "No.", request_id: "req_1" } }.to_json

  # WebMock only for these tests: the generated ones talk to local servers.
  def setup
    WebMock.enable!
    WebMock.disable_net_connect!
    @coss = Coss::Client.new(api_key: "coss_test_key", base_url: BASE)
  end

  def teardown
    WebMock.reset!
    WebMock.allow_net_connect!
    WebMock.disable!
  end

  def responses(*statuses)
    statuses.map do |status|
      body = status >= 300 ? ERROR : EMAIL.to_json
      { status: status, body: body, headers: { "Content-Type" => "application/json", "Retry-After" => "0" } }
    end
  end

  def test_sends_the_coss_headers
    stub = stub_request(:get, "#{BASE}/v1/emails/email_1").with(
      headers: {
        "Authorization" => "Bearer coss_test_key",
        "User-Agent" => "coss-ruby/#{File.read(File.join(ROOT, "sdks/VERSION")).strip}",
        "Coss-Version" => /\A\d{4}-\d{2}-\d{2}\z/
      }
    ).to_return(*responses(200))
    @coss.email.get(id: "email_1")

    assert_requested stub
  end

  def test_retries_a_post_with_one_idempotency_key
    keys = []
    stub_request(:post, "#{BASE}/v1/emails")
      .with { |request| keys << request.headers["Idempotency-Key"] }
      .to_return(*responses(503, 409, 202))
    @coss.email.send_(from: "hello@acme.test", to: ["someone@example.com"], subject: "Hi", text: "Hi")

    assert_equal 3, keys.size
    assert_equal 1, keys.uniq.size
    refute_empty keys.first.to_s
  end

  def test_keeps_the_callers_idempotency_key
    stub = stub_request(:post, "#{BASE}/v1/emails")
           .with(headers: { "Idempotency-Key" => "order-42" }) { |request| !JSON.parse(request.body).key?("idempotency_key") }
           .to_return(*responses(202))
    @coss.email.send_(from: "hello@acme.test", to: ["someone@example.com"], subject: "Hi", text: "Hi",
                      idempotency_key: "order-42")

    assert_requested stub
  end

  [400, 402, 404, 422].each do |status|
    define_method("test_never_retries_#{status}") do
      stub = stub_request(:get, "#{BASE}/v1/emails/email_1").to_return(*responses(status))
      error = assert_raises(Coss::Errors::ResponseError) { @coss.email.get(id: "email_1") }
      assert_equal status, error.code
      assert_requested stub, times: 1
    end
  end

  def test_never_retries_what_the_api_does_not_deduplicate
    stub = stub_request(:post, "#{BASE}/v1/webhook_endpoints").to_return(*responses(503, 200))
    assert_raises(Coss::Errors::ResponseError) { @coss.webhook_endpoints.create(url: "https://example.com/hooks") }
    assert_requested stub, times: 1
  end

  def test_sends_an_explicit_null_and_leaves_omitted_fields_out
    endpoint = JSON.parse(File.read(File.join(ROOT, "apps/api/openapi.json")))
                   .dig("components", "schemas", "WebhookEndpoint", "examples", 0)
    stub = stub_request(:patch, "#{BASE}/v1/webhook_endpoints/we_1")
           .with(body: { description: nil }.to_json)
           .to_return(status: 200, body: endpoint.to_json, headers: { "Content-Type" => "application/json" })
    @coss.webhook_endpoints.update(id: "we_1", description: nil)

    assert_requested stub
  end

  def test_returns_the_body_of_non_json_responses
    raw = "From: ada@example.com\r\nSubject: Hi\r\n\r\nHello"
    stub_request(:get, "#{BASE}/v1/received_emails/inb_1/raw")
      .to_return(status: 200, body: raw, headers: { "Content-Type" => "message/rfc822" })

    assert_equal raw, @coss.email.received.get_raw(id: "inb_1")
  end
end
