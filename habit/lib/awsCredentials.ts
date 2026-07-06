import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

/**
 * Returns AWS SDK client config appropriate to the environment.
 *
 * - Production (Vercel): `AWS_ROLE_ARN` is set. We federate the Vercel OIDC
 *   token into temporary credentials for the `habit-vercel-app` role.
 * - Local dev: `AWS_ROLE_ARN` is unset. We return just the region and let the
 *   SDK's default credential chain pick up `AWS_PROFILE` from ~/.aws/credentials.
 */
export function getAwsClientConfig() {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const roleArn = process.env.AWS_ROLE_ARN;

  if (roleArn) {
    return {
      region,
      credentials: awsCredentialsProvider({ roleArn }),
    };
  }

  return { region };
}
