namespace Coss;

/// <summary>
/// Base exception class for all exceptions thrown by the SDK.
/// </summary>
public class CossClientException(string message, Exception? innerException = null)
    : Exception(message, innerException);
