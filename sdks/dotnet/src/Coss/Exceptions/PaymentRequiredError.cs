namespace Coss;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class PaymentRequiredError(ErrorResponse body, Coss.RawResponse? rawResponse = null)
    : CossClientApiException("PaymentRequiredError", 402, body, rawResponse: rawResponse)
{
    /// <summary>
    /// The body of the response that triggered the exception.
    /// </summary>
    public new ErrorResponse Body => body;
}
