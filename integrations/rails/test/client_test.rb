# frozen_string_literal: true

require "test_helper"

class ClientTest < Minitest::Test
  include CossTestHelpers

  def setup
    @sleeps = []
  end

  def test_retry_after_as_an_http_date
    now = Time.utc(2026, 10, 16, 12, 0, 0)

    assert_equal 3000, Coss::Rails::Client.parse_retry_after((now + 3).httpdate, now: now)
    assert_equal 0, Coss::Rails::Client.parse_retry_after((now - 3).httpdate, now: now)
    assert_equal 1500, Coss::Rails::Client.parse_retry_after("1.5", now: now)
    assert_nil Coss::Rails::Client.parse_retry_after("-1", now: now)
    assert_nil Coss::Rails::Client.parse_retry_after("soon", now: now)
    assert_nil Coss::Rails::Client.parse_retry_after(nil, now: now)
  end

  def test_an_http_date_retry_after_is_honoured
    stub_request(:post, API_URL)
      .to_return(status: 503, headers: { "Retry-After" => (Time.now + 5).httpdate }, body: "")
      .then.to_return(email_response)

    client.send_email(minimal)

    assert_equal 1, @sleeps.size
    assert_in_delta 5, @sleeps.first, 1.1
  end

  def test_connect_timeouts_are_timeout_errors
    stub_request(:post, API_URL).to_timeout

    error = assert_raises(Coss::Rails::DeliveryError) { client(max_retries: 0).send_email(minimal) }

    assert_equal "timeout_error", error.type
    assert_equal "request_timeout", error.code
    assert_nil error.status
  end

  def test_other_network_errors
    [SocketError, Errno::ECONNRESET, EOFError, OpenSSL::SSL::SSLError].each do |klass|
      stub_request(:post, API_URL).to_raise(klass)

      error = assert_raises(Coss::Rails::DeliveryError) { client(max_retries: 0).send_email(minimal) }

      assert_equal "connection_error", error.type, klass.name
      assert_equal "network_error", error.code, klass.name
      assert_includes error.message, "https://api.coss.test", klass.name
    end
  end

  def test_trailing_slashes_are_trimmed_from_the_base_url
    stub_request(:post, API_URL).to_return(email_response)

    assert_equal "queued", client(base_url: "https://api.coss.test//").send_email(minimal)["status"]
  end

  def test_an_invalid_idempotency_key_fails_before_sending
    error = assert_raises(Coss::Rails::DeliveryError) { client.send_email(minimal, idempotency_key: "line\nbreak") }

    assert_equal "invalid_header", error.code
    assert_not_requested :post, API_URL
  end

  def test_the_body_is_utf8_json
    stub_request(:post, API_URL).to_return(email_response)
    requests = record_requests
    client.send_email(minimal.merge("subject" => "Grüße ✓"))

    assert_equal "Grüße ✓", JSON.parse(requests.first.body)["subject"]
  end

  def test_the_default_sleep_takes_seconds
    stub_request(:post, API_URL).to_return(status: 503, headers: { "Retry-After" => "0.01" }, body: "")
                                .then.to_return(email_response)
    started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    Coss::Rails::Client.new(api_key: "coss_test_x", base_url: "https://api.coss.test").send_email(minimal)

    assert_operator Process.clock_gettime(Process::CLOCK_MONOTONIC) - started, :<, 1
  end

  private

  def client(**)
    Coss::Rails::Client.new(api_key: "coss_test_x", base_url: "https://api.coss.test",
                            sleep: ->(seconds) { @sleeps << seconds }, random: -> { 0 }, **)
  end

  def minimal
    { "from" => "hello@acme.test", "to" => ["ada@example.com"], "subject" => "Hello", "text" => "Hi" }
  end
end
