/**
 * @description Dynamic AWS metadata.
 */
export type DynamicMetadata = {
  /**
   * @description The AWS account ID that the system is running in.
   */
  accountId?: string;
  /**
   * @description Correlation ID (AWS request ID) for this function call.
   */
  correlationId?: string;
  /**
   * @description Memory size of the current function.
   */
  functionMemorySize?: string;
  /**
   * @description The name of the function.
   */
  functionName?: string;
  /**
   * @description The version of the function.
   */
  functionVersion?: string;
  /**
   * @description The region of the responding function/system.
   */
  region?: string;
  /**
   * @description The resource (channel, URL path...) that is responding.
   */
  resource?: string;
  /**
   * @description What runtime is used?
   */
  runtime?: string;
  /**
   * @description What AWS stage are we in?
   */
  stage?: string;
  /**
   * @description Request time in Unix epoch of the incoming request.
   */
  timestampRequest?: string;
  /**
   * @description The user in this context.
   */
  user?: string;
  /**
   * @description Which country did AWS CloudFront infer the user to be in?
   */
  viewerCountry?: string;
};
