# frozen_string_literal: true

require "test_helper"

# Runs integrations/conformance/http.json: retries, Retry-After and error mapping.
class HttpConformanceTest < Minitest::Test
  include CossTestHelpers

  SPEC = CossTestHelpers.conformance("http")
  MINIMAL = CossTestHelpers.conformance("message").dig("messages", "minimal")

  SPEC["scenarios"].each do |scenario|
    define_method("test_#{scenario['name'].gsub(/\W+/, '_')}") { run_scenario(scenario) }
  end

  private

  def run_scenario(scenario)
    stub_responses(scenario["responses"])
    requests = record_requests
    sleeps = []
    random = scenario.fetch("random", 0)
    settings = {
      api_key: "coss_test_conformance",
      base_url: "https://api.coss.test",
      sleep: ->(seconds) { sleeps << (seconds * 1000).round(6) },
      random: -> { random }
    }
    settings[:max_retries] = scenario.dig("options", "max_retries") if scenario.dig("options", "max_retries")
    mail = build_mail(MINIMAL["input"])
    expect = scenario["expect"]

    outcome = begin
      Coss::Rails::DeliveryMethod.new(settings).deliver!(mail)
    rescue Coss::Rails::DeliveryError => e
      e
    end

    assert_equal expect["attempts"], requests.size, "attempts"
    assert_equal expect["delays_ms"], sleeps, "delays"
    assert_requests(requests)

    if expect["outcome"] == "ok"
      assert_equal SPEC["email"], outcome
      assert_equal SPEC["email"], mail.coss_email
    else
      assert_kind_of Coss::Rails::DeliveryError, outcome
      assert_error(expect["error"], outcome)
      assert_equal expect["error_message"], outcome.message if expect["error_message"]

      assert_nil mail.coss_email
    end
  end

  def stub_responses(responses)
    stub = stub_request(:post, API_URL)
    responses.each_with_index do |response, index|
      stub = stub.then if index.positive?
      stub = if response["network_error"]
               stub.to_raise(Errno::ECONNREFUSED)
             elsif response["timeout"]
               stub.to_raise(Net::ReadTimeout)
             else
               stub.to_return(status: response["status"], headers: response["headers"] || {},
                              body: response_body(response["body"]))
             end
    end
  end

  def response_body(body)
    return JSON.generate(SPEC["email"]) if body == "@email"

    body.is_a?(String) ? body : JSON.generate(body)
  end

  def assert_requests(requests)
    keys = requests.map do |request|
      assert_equal :post, request.method
      assert_equal API_URL, request.uri.omit(:port).to_s
      headers = downcase_headers(request.headers)

      SPEC["request_headers"].each { |name, value| assert_equal value, headers[name.downcase], name }
      assert_equal "coss-rails/#{Coss::Rails::VERSION}", headers["user-agent"]
      assert_equal MINIMAL["body"], JSON.parse(request.body)
      headers["idempotency-key"]
    end

    assert_equal 1, keys.uniq.size, "one Idempotency-Key across attempts"
    assert_match(/\A\h{8}-\h{4}-\h{4}-\h{4}-\h{12}\z/, keys.first)
  end

  def assert_error(expected, error)
    expected.each do |field, value|
      actual = field == "message" ? error.error_message : error.public_send(field)
      if value.nil?
        assert_nil actual, field
      else
        assert_equal value, actual, field
      end
    end
  end
end

# Runs integrations/conformance/message.json: the helpers' value tables and the exact request bodies.
class MessageConformanceTest < Minitest::Test
  include CossTestHelpers

  SPEC = CossTestHelpers.conformance("message")

  def test_header_values
    SPEC["header_values"].each do |row|
      sent = row["sent"] || ""

      assert_equal sent, Coss::Rails::Mime.encode_header_value(row["value"]), row["value"].inspect
    end
  end

  def test_header_values_in_a_message
    SPEC["header_values"].each do |row|
      mail = build_mail(SPEC.dig("messages", "minimal", "input"))
      mail["X-Test"] = row["value"]
      body, = Coss::Rails::MessageMapper.new(mail).to_request

      if row["sent"].nil?
        assert_nil body["headers"], row["value"].inspect
      else
        assert_equal({ "X-Test" => row["sent"] }, body["headers"], row["value"].inspect)
      end
    end
  end

  def test_addresses
    SPEC["addresses"].each do |row|
      assert_equal row["formatted"], Coss::Rails::Mime.format_address(row["address"], row["name"]), row.inspect
    end
  end

  def test_addresses_in_a_message
    SPEC["addresses"].each do |row|
      mail = build_mail(SPEC.dig("messages", "minimal", "input"))
      mail[:to] = mail_address(row)
      body, = Coss::Rails::MessageMapper.new(mail).to_request

      assert_equal [row["formatted"]], body["to"], row.inspect
    end
  end

  def test_media_types
    SPEC["media_types"].each do |row|
      actual = Coss::Rails::Mime.media_type(row["given"])
      if row["sent"].nil?
        assert_nil actual, row.inspect
      else
        assert_equal row["sent"], actual, row.inspect
      end
    end
  end

  RESERVED_VALUES = {
    "cc" => "carol@example.com", "bcc" => "dan@example.com", "reply-to" => "support@acme.test",
    "return-path" => "hello@acme.test", "date" => "Thu, 15 Oct 2026 10:00:00 +0000",
    "message-id" => "<custom@acme.test>", "mime-version" => "1.0",
    "content-type" => "text/plain; charset=UTF-8", "content-transfer-encoding" => "8bit",
    "content-disposition" => "inline", "dkim-signature" => "v=1; a=rsa-sha256",
    "received" => "from mx.example.com", "x-ses-configuration-set" => "nope"
  }.freeze

  def test_reserved_headers_are_dropped
    SPEC["reserved_headers"].each do |name|
      assert Coss::Rails::Mime.reserved_header?(name), "#{name} is reserved"
      assert Coss::Rails::Mime.reserved_header?(name.upcase), "#{name.upcase} is reserved"
      next unless RESERVED_VALUES.key?(name.downcase)

      mail = build_mail(SPEC.dig("messages", "minimal", "input"))
      mail[name] = RESERVED_VALUES[name.downcase]
      body, = Coss::Rails::MessageMapper.new(mail).to_request

      refute body.key?("headers"), "#{name} was sent: #{body['headers'].inspect}"
    end
    # From, To, Subject (and Sender, refused) are covered by the message bodies and refusals.
  end

  SPEC["messages"].each do |name, message|
    define_method("test_message_#{name}") do
      stub_request(:post, API_URL).to_return(email_response)
      requests = record_requests
      mail = build_mail(message["input"])
      email = Coss::Rails::DeliveryMethod.new(api_key: "coss_test_conformance", base_url: "https://api.coss.test")
                                         .deliver!(mail)

      assert_equal "email_01k0000000000000000000000", email["id"]
      assert_equal 1, requests.size
      assert_equal normalize(message["body"]), normalize(JSON.parse(requests.first.body))
      key = downcase_headers(requests.first.headers)["idempotency-key"]
      if message["idempotency_key"]
        assert_equal message["idempotency_key"], key
      else
        assert_match(/\A\h{8}-\h{4}-\h{4}-\h{4}-\h{12}\z/, key)
      end
    end
  end

  private

  # Header names compare case-insensitively.
  def normalize(body)
    return body unless body["headers"]

    body.merge("headers" => downcase_headers(body["headers"]))
  end
end
