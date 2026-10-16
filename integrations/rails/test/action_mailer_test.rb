# frozen_string_literal: true

require "test_helper"
require "support/mailers"

class ActionMailerTest < Minitest::Test
  include CossTestHelpers

  def setup
    @settings = ActionMailer::Base.coss_settings
    @sleeps = []
    ActionMailer::Base.coss_settings = @settings.merge(sleep: ->(seconds) { @sleeps << seconds })
  end

  def teardown
    ActionMailer::Base.coss_settings = @settings
    super
  end

  def test_the_railtie_registers_the_delivery_method_and_its_settings
    assert_equal Coss::Rails::DeliveryMethod, ActionMailer::Base.delivery_methods[:coss]
    assert_equal :coss, ActionMailer::Base.delivery_method
    assert_equal({ api_key: "coss_test_railtie", base_url: "https://api.coss.test" }, @settings)
    assert_includes ActionMailer::Base.ancestors, Coss::Rails::Mailer
  end

  def test_deliver_now_sends_the_mailer_message
    stub_request(:post, API_URL).to_return(email_response("email_receipt"))
    requests = record_requests
    message = ReceiptMailer.receipt(42).deliver_now

    assert_equal 1, requests.size
    request = requests.first
    headers = downcase_headers(request.headers)

    assert_equal "Bearer coss_test_railtie", headers["authorization"]
    assert_equal "order-42", headers["idempotency-key"]
    body = JSON.parse(request.body)
    logo = message.attachments["logo.png"]

    assert_equal(
      {
        "from" => "\"Acme, Inc.\" <hello@acme.test>",
        "to" => ["Ada Lovelace <ada@example.com>"],
        "cc" => ["carol@example.com"],
        "bcc" => ["Dan <dan@example.com>"],
        "reply_to" => ["support@acme.test"],
        "subject" => "Your receipt ✓",
        "html" => %(<p>Thanks! <img src="cid:logo@acme"></p>),
        "text" => "Thanks for your order!",
        "attachments" => [
          { "filename" => "logo.png", "content" => "iVBORw0KGgo=", "content_type" => "image/png",
            "content_id" => "logo@acme" },
          { "filename" => "receipt.pdf", "content" => Base64.strict_encode64("%PDF-1.4\n"),
            "content_type" => "application/pdf" }
        ],
        "headers" => { "X-Campaign" => "spring", "X-Greeting" => "=?UTF-8?B?R3LDvMOfZQ==?=" },
        "category" => "receipts",
        "tags" => [{ "name" => "plan", "value" => "pro" }, { "name" => "order", "value" => "42" }],
        "tracking" => { "opens" => true, "clicks" => false }
      },
      body
    )
    assert_predicate logo, :inline?
    assert_equal({ "object" => "email", "id" => "email_receipt", "status" => "queued" }, message.coss_email)
  end

  def test_deliver_later_keeps_the_coss_options
    stub_request(:post, API_URL).to_return(email_response)
    requests = record_requests
    ReceiptMailer.receipt(7, "2026-11-01T10:00:00.250+01:00").deliver_later

    assert_equal 1, requests.size
    body = JSON.parse(requests.first.body)

    assert_equal "order-7", downcase_headers(requests.first.headers)["idempotency-key"]
    assert_equal "receipts", body["category"]
    assert_equal [{ "name" => "plan", "value" => "pro" }, { "name" => "order", "value" => "7" }], body["tags"]
    assert_equal "2026-11-01T09:00:00Z", body["scheduled_at"]
    assert_equal({ "opens" => true, "clicks" => false }, body["tracking"])
  end

  def test_deliver_now_bang_returns_the_email_with_return_response
    ActionMailer::Base.coss_settings = ActionMailer::Base.coss_settings.merge(return_response: true)
    stub_request(:post, API_URL).to_return(email_response("email_returned"))

    email = ReceiptMailer.plain.deliver_now!

    assert_equal({ "object" => "email", "id" => "email_returned", "status" => "queued" }, email)
  end

  def test_deliver_now_returns_the_message
    stub_request(:post, API_URL).to_return(email_response("email_plain"))
    message = ReceiptMailer.plain.deliver_now

    assert_kind_of Mail::Message, message
    assert_equal "email_plain", message.coss_email["id"]
  end

  def test_a_plain_message_is_the_minimal_body
    stub_request(:post, API_URL).to_return(email_response)
    requests = record_requests
    ReceiptMailer.plain.deliver_now

    assert_equal(
      { "from" => "\"Acme, Inc.\" <hello@acme.test>", "to" => ["ada@example.com"], "subject" => "Hello",
        "text" => "Hi Ada" },
      JSON.parse(requests.first.body)
    )
    assert_match(/\A\h{8}-/, downcase_headers(requests.first.headers)["idempotency-key"])
  end

  def test_api_errors_raise_delivery_error
    stub_request(:post, API_URL).to_return(
      status: 422,
      headers: { "X-Request-Id" => "req_header" },
      body: JSON.generate({ "error" => { "type" => "invalid_request_error", "code" => "domain_not_verified",
                                         "message" => "Verify acme.test first.", "param" => "from" } })
    )
    error = assert_raises(Coss::Rails::DeliveryError) { ReceiptMailer.plain.deliver_now }

    assert_equal "invalid_request_error", error.type
    assert_equal "domain_not_verified", error.code
    assert_equal 422, error.status
    assert_equal "req_header", error.request_id
    assert_equal "from", error.param
    assert_nil error.issues
    assert_equal "coss.com could not send the email: Verify acme.test first. (domain_not_verified)", error.message
  end

  def test_raise_delivery_errors_false_swallows_errors
    stub_request(:post, API_URL).to_return(status: 401, body: "{}")
    ActionMailer::Base.raise_delivery_errors = false
    message = ReceiptMailer.plain.deliver_now

    assert_nil message.coss_email
  ensure
    ActionMailer::Base.raise_delivery_errors = true
  end

  def test_a_missing_api_key_fails_the_delivery_not_the_boot
    ActionMailer::Base.coss_settings = { base_url: "https://api.coss.test" }
    previous = ENV.delete("COSS_API_KEY")
    message = ReceiptMailer.plain # building the message is fine

    error = assert_raises(Coss::Rails::ConfigurationError) { message.deliver_now }
    assert_includes error.message, "coss_settings[:api_key]"
    assert_includes error.message, "COSS_API_KEY"
    assert_not_requested :post, API_URL
  ensure
    ENV["COSS_API_KEY"] = previous if previous
  end

  def test_the_api_key_falls_back_to_the_environment
    ActionMailer::Base.coss_settings = { base_url: "https://api.coss.test" }
    previous = ENV.fetch("COSS_API_KEY", nil)
    ENV["COSS_API_KEY"] = "coss_test_from_env"
    stub_request(:post, API_URL).with(headers: { "Authorization" => "Bearer coss_test_from_env" })
                                .to_return(email_response)

    assert_equal "email_01k0000000000000000000000", ReceiptMailer.plain.deliver_now.coss_email["id"]
  ensure
    previous ? ENV["COSS_API_KEY"] = previous : ENV.delete("COSS_API_KEY")
  end

  def test_the_base_url_falls_back_to_the_environment
    ActionMailer::Base.coss_settings = { api_key: "coss_test_settings" }
    previous = ENV.fetch("COSS_BASE_URL", nil)
    ENV["COSS_BASE_URL"] = "https://eu.api.coss.test/"
    stub_request(:post, "https://eu.api.coss.test/v1/emails").to_return(email_response)

    assert_equal "email_01k0000000000000000000000", ReceiptMailer.plain.deliver_now.coss_email["id"]
  ensure
    previous ? ENV["COSS_BASE_URL"] = previous : ENV.delete("COSS_BASE_URL")
  end

  def test_unknown_coss_options_raise
    error = assert_raises(ArgumentError) { ReceiptMailer.with_bad_coss_option.message }

    assert_includes error.message, "colour"
  end

  def test_a_sender_header_is_refused
    assert_refused("Sender") { ReceiptMailer.plain(sender: "bounces@acme.test").deliver_now }
  end

  def test_a_return_path_other_than_from_is_refused
    assert_refused("Return-Path") { ReceiptMailer.plain(return_path: "bounces@other.test").deliver_now }
  end

  def test_a_return_path_equal_to_from_is_fine
    stub_request(:post, API_URL).to_return(email_response)

    assert ReceiptMailer.plain(return_path: "Hello@Acme.test").deliver_now.coss_email
  end

  def test_explicit_envelope_recipients_are_refused_unless_they_match
    assert_refused("envelope recipients") { ReceiptMailer.with_envelope_to(["eve@example.com"]).deliver_now }

    stub_request(:post, API_URL).to_return(email_response)

    assert ReceiptMailer.with_envelope_to(["ADA@example.com"]).deliver_now.coss_email
  end

  def test_an_explicit_envelope_sender_is_refused_unless_it_matches
    assert_refused("envelope sender") { ReceiptMailer.with_envelope_from("bounces@other.test").deliver_now }

    stub_request(:post, API_URL).to_return(email_response)

    assert ReceiptMailer.with_envelope_from("Acme <hello@acme.test>").deliver_now.coss_email
  end

  def test_a_header_given_twice_is_refused
    assert_refused("X-Dup") { ReceiptMailer.duplicate_header.deliver_now }
  end

  def test_a_header_with_several_values_is_refused
    assert_refused("X-List") { ReceiptMailer.multi_valued_header.deliver_now }
  end

  private

  def assert_refused(fragment, &)
    error = assert_raises(Coss::Rails::UnsupportedMessageError, &)

    assert_includes error.message, fragment
    assert_not_requested :post, API_URL
  end
end
