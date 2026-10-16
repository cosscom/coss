# frozen_string_literal: true

module Coss
  module Rails
    # Turns a `Mail::Message` into the `POST /v1/emails` body (`integrations/README.md`,
    # "The message"), refusing what coss.com can't send.
    class MessageMapper
      # Headers read into the body's own fields (all reserved by the API as headers too).
      ADDRESS_FIELDS = { to: :to, cc: :cc, bcc: :bcc, reply_to: :reply_to }.freeze
      # Not sent as custom headers: the part's own Content-ID at the top level (single-part messages).
      SKIPPED_HEADERS = %w[content-id].freeze
      BODY_TYPES = %w[text/plain text/html].freeze

      def initialize(mail)
        @mail = mail
      end

      # Returns `[body, idempotency_key]`; `idempotency_key` is nil unless the message sets one.
      def to_request
        refuse_unsupported_envelope!
        options = Options.normalize(@mail.coss_options || {})

        body = { "from" => from, "to" => addresses(:to) }
        %i[cc bcc reply_to].each { |field| put(body, field.to_s, addresses(field)) }
        body["subject"] = Mime.utf8(@mail.subject.to_s)
        html, text, attachments = contents
        put(body, "html", html)
        put(body, "text", text)
        put(body, "attachments", attachments)
        put(body, "headers", custom_headers)
        %i[category tags scheduled_at tracking].each { |key| put(body, key.to_s, options[key]) }

        [body, options[:idempotency_key]]
      end

      private

      # Sets `body[key]` unless `value` is nil or empty: empty fields are left out.
      def put(body, key, value)
        body[key] = value unless value.nil? || (value.respond_to?(:empty?) && value.empty?)
      end

      def refuse!(what, instead)
        raise UnsupportedMessageError, "coss-rails: #{what} can't be sent through coss.com; #{instead}."
      end

      # --- addresses ---------------------------------------------------------------------------

      def address_list(name)
        field = @mail.header[name]
        return [] if field.nil?

        if field.is_a?(Array)
          refuse!("a `#{field.first.name}` header given more than once", "give one header with every address")
        end
        unless field.respond_to?(:addrs)
          refuse!("a `#{field.name}` header that isn't a valid address list", "fix its addresses")
        end

        field.addrs
      end

      def addresses(name)
        address_list(name).filter_map do |address|
          next if address.address.nil? || address.address.empty?

          Mime.format_address(Mime.utf8(address.address), address.display_name)
        end
      end

      def from
        list = address_list(:from)
        raise UnsupportedMessageError, "coss-rails: the message has no From address." if list.empty?

        refuse!("more than one From address", "send from one address") if list.size > 1

        Mime.format_address(Mime.utf8(list.first.address), list.first.display_name)
      end

      # A Sender naming the From address is harmless (dropped like other reserved headers).
      def refuse_foreign_sender!
        sender = @mail.header[:sender] && @mail.sender
        return if sender.nil? || sender.to_s.empty? || sender.to_s.downcase == from_address

        refuse!("a `Sender` header other than the From address",
                "coss.com sets the Sender itself; set `from` instead")
      end

      def from_address
        @from_address ||= address_list(:from).first&.address.to_s.downcase
      end

      # --- envelope ----------------------------------------------------------------------------

      def refuse_unsupported_envelope!
        refuse_foreign_sender!

        return_path = @mail.return_path
        if return_path && !return_path.to_s.empty? && return_path.to_s.downcase != from_address
          refuse!("a Return-Path other than the From address", "coss.com handles bounces itself")
        end

        # Mail derives the envelope from the headers unless it was set explicitly (an instance
        # variable of its own; the readers can't tell an explicit value from the default).
        envelope_from = @mail.instance_variable_get(:@smtp_envelope_from)
        if envelope_from && envelope_address(envelope_from) != from_address
          refuse!("an SMTP envelope sender other than the From address", "coss.com sends from the From address")
        end

        envelope_to = @mail.instance_variable_get(:@smtp_envelope_to)
        return unless envelope_to

        given = Array(envelope_to).map { |address| envelope_address(address) }.uniq.sort
        destinations = Array(@mail.destinations).map { |address| address.to_s.downcase }.uniq.sort
        return if given == destinations

        refuse!("SMTP envelope recipients other than to + cc + bcc", "coss.com sends to the message's recipients")
      end

      def envelope_address(value)
        string = value.to_s
        address = string.include?("<") ? Mail::Address.new(string).address : string
        address.to_s.strip.downcase
      rescue Mail::Field::ParseError
        string.strip.downcase
      end

      # --- bodies and attachments --------------------------------------------------------------

      # `[html, text, attachments]` from the message's leaf parts (the message itself when it is
      # single-part). Anything that is neither the one text part, the one HTML part nor an
      # attachment is refused.
      def contents
        html = nil
        text = nil
        attachments = []
        leaves(@mail).each do |part|
          if attachment?(part)
            attachments << attachment(part, attachments.size + 1)
            next
          end

          case part.mime_type&.downcase
          when nil, "text/plain"
            refuse!("a second text/plain part", "send one text and one HTML body") unless text.nil?
            text = body_text(part)
          when "text/html"
            refuse!("a second text/html part", "send one HTML body") unless html.nil?
            html = body_text(part)
          else
            refuse!("a #{part.mime_type} part that isn't an attachment",
                    "send one text and one HTML body, and attach anything else")
          end
        end
        [html, text, attachments]
      end

      # Mail only sets a multipart Content-Type when it encodes the message, so a message with
      # parts counts as multipart whatever its header says so far.
      def leaves(part)
        return (part.multipart? ? [] : [part]) if part.parts.empty?

        # A multipart attachment (an attached multipart/mixed tree) would otherwise be taken
        # apart below and its text sent as the email's body.
        refuse!("a multipart attachment", "attach its files one by one") if !part.equal?(@mail) && attachment?(part)
        part.parts.flat_map { |child| leaves(child) }
      end

      def attachment?(part)
        return true if part.attachment?

        disposition = disposition_type(part)
        return true if disposition == "attachment"

        (disposition == "inline" || content_id?(part)) && !BODY_TYPES.include?(part.mime_type&.downcase)
      end

      def disposition_type(part)
        field = part.header[:content_disposition]
        field.respond_to?(:disposition_type) ? field.disposition_type.to_s.downcase : nil
      end

      def body_text(part)
        Mime.utf8(part.decoded)
      end

      def attachment(part, position)
        filename = part.filename
        params = {
          "filename" => filename.nil? || filename.to_s.empty? ? "attachment-#{position}" : Mime.utf8(filename),
          # The bytes as sent: body.decoded undoes the transfer encoding without transcoding text.
          "content" => Mime.base64(part.body.decoded)
        }
        content_type = Mime.media_type(part.mime_type)
        params["content_type"] = content_type if content_type
        content_id = content_id(part)
        params["content_id"] = content_id if content_id
        params
      end

      def content_id(part)
        if disposition_type(part) == "inline" && !content_id?(part) && part.respond_to?(:add_content_id)
          # Mail would generate one when encoding the message; do it now so it can be referenced.
          part.add_content_id
        end
        content_id?(part) ? Mime.bare_content_id(part.header[:content_id].value) : nil
      end

      def content_id?(part)
        !part.header[:content_id].nil?
      end

      # --- headers -----------------------------------------------------------------------------

      def custom_headers
        headers = {}
        seen = {}
        @mail.header.fields.each do |field|
          name = field.name.to_s.strip
          lower = name.downcase
          next if name.empty? || Mime.reserved_header?(name) || SKIPPED_HEADERS.include?(lower)

          value = header_value(field)
          refuse!("the `#{name}` header given more than once", "coss.com sends each header once") if seen[lower]
          seen[lower] = true

          encoded = Mime.encode_header_value(value)
          headers[name] = encoded unless encoded.empty?
        end
        headers
      end

      # The value as the app gave it (before Mail's encoding), so the README's encoding applies.
      def header_value(field)
        value = field.unparsed_value
        if value.is_a?(Array)
          refuse!("the `#{field.name}` header with several values", "coss.com sends each header once") if value.size > 1
          value = value.first
        end
        value = field.decoded if value.nil? && field.respond_to?(:decoded)
        Mime.utf8(value.to_s)
      end
    end
  end
end
