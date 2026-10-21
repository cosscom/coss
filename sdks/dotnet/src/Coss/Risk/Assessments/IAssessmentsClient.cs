using Coss;

namespace Coss.Risk;

public partial interface IAssessmentsClient
{
    /// <summary>
    /// The assessments of the API key's environment, newest first. `review_status=open` is the review queue. Pass the last `id` as `after` to get the next page while `has_more` is true.
    /// </summary>
    WithRawResponseTask<RiskAssessmentList> ListAsync(
        ListAssessmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// The email address and IP address are removed 90 days after the assessment; the decision, reasons and signals stay for a year.
    /// </summary>
    WithRawResponseTask<RiskAssessment> GetAsync(
        GetAssessmentsRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
