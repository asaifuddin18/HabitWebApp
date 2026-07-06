import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";

export interface HabitStackProps extends cdk.StackProps {
  /** GitHub repo (owner/name) permitted to assume the GitHub Actions deploy role. */
  githubRepo: string;
  /** Vercel team slug, used to build the OIDC issuer URL and subject condition. */
  vercelTeamSlug: string;
  /** Vercel project name (used in the OIDC subject condition). */
  vercelProject: string;
}

/**
 * HabitWebApp infrastructure.
 *
 * Mirrors the CookBookWebsite stack but namespaced with a `habit-` prefix so it
 * can live in the same AWS account without colliding.
 *
 * Resources:
 *   - DynamoDB `habit-tasks`        (recurring task definitions, per user)
 *   - DynamoDB `habit-completions`  (per-date check-offs, per user)
 *   - IAM role `habit-vercel-app`            (runtime access from the Vercel app via OIDC)
 *   - IAM role `habit-github-actions-deploy` (CDK deploys from GitHub Actions via OIDC)
 *
 * Both OIDC providers (GitHub + Vercel) are assumed to ALREADY EXIST in the
 * account because CookBookWebsite created them. We import them by ARN rather
 * than recreating them (a duplicate provider would fail to deploy).
 */
export class HabitStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HabitStackProps) {
    super(scope, id, props);

    const account = cdk.Stack.of(this).account;

    // ---------------------------------------------------------------------
    // DynamoDB
    // ---------------------------------------------------------------------

    // Task definitions. One item per recurring task.
    //   PK userId  (Google account subject)
    //   SK taskId  (uuid)
    const tasksTable = new dynamodb.Table(this, "TasksTable", {
      tableName: "habit-tasks",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "taskId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Per-date completions. One item per (task, date) the user checked off.
    //   PK userId
    //   SK "<YYYY-MM-DD>#<taskId>"   → range-query a whole day with begins_with
    const completionsTable = new dynamodb.Table(this, "CompletionsTable", {
      tableName: "habit-completions",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // ---------------------------------------------------------------------
    // IAM — runtime role assumed by the Vercel app (OIDC federation)
    // ---------------------------------------------------------------------

    const vercelIssuerUrl = `oidc.vercel.com/${props.vercelTeamSlug}`;
    const vercelProviderArn = `arn:aws:iam::${account}:oidc-provider/${vercelIssuerUrl}`;

    const vercelPrincipal = new iam.WebIdentityPrincipal(vercelProviderArn, {
      StringEquals: {
        [`${vercelIssuerUrl}:aud`]: `https://vercel.com/${props.vercelTeamSlug}`,
      },
      StringLike: {
        // Restrict to this project's production + preview deployments.
        [`${vercelIssuerUrl}:sub`]: `owner:${props.vercelTeamSlug}:project:${props.vercelProject}:environment:*`,
      },
    });

    const vercelAppRole = new iam.Role(this, "VercelAppRole", {
      roleName: "habit-vercel-app",
      assumedBy: vercelPrincipal,
      description: "Runtime role assumed by the HabitWebApp Vercel deployment",
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Least-privilege: only the two Habit tables.
    tasksTable.grantReadWriteData(vercelAppRole);
    completionsTable.grantReadWriteData(vercelAppRole);

    // ---------------------------------------------------------------------
    // IAM — deploy role assumed by GitHub Actions (OIDC federation)
    // ---------------------------------------------------------------------

    const githubIssuerUrl = "token.actions.githubusercontent.com";
    const githubProviderArn = `arn:aws:iam::${account}:oidc-provider/${githubIssuerUrl}`;

    const githubPrincipal = new iam.WebIdentityPrincipal(githubProviderArn, {
      StringEquals: {
        [`${githubIssuerUrl}:aud`]: "sts.amazonaws.com",
      },
      StringLike: {
        [`${githubIssuerUrl}:sub`]: `repo:${props.githubRepo}:*`,
      },
    });

    const githubDeployRole = new iam.Role(this, "GithubActionsDeployRole", {
      roleName: "habit-github-actions-deploy",
      assumedBy: githubPrincipal,
      description: "Role assumed by GitHub Actions to run `cdk deploy` for HabitWebApp",
      maxSessionDuration: cdk.Duration.hours(1),
      // CDK deploys touch CloudFormation, IAM, DynamoDB, S3 (assets), etc.
      // CookBook uses AdministratorAccess for its deploy role; matched here.
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"),
      ],
    });

    // ---------------------------------------------------------------------
    // Outputs
    // ---------------------------------------------------------------------

    new cdk.CfnOutput(this, "TasksTableName", { value: tasksTable.tableName });
    new cdk.CfnOutput(this, "CompletionsTableName", { value: completionsTable.tableName });
    new cdk.CfnOutput(this, "VercelAppRoleArn", {
      value: vercelAppRole.roleArn,
      description: "Set as AWS_ROLE_ARN in Vercel env vars",
    });
    new cdk.CfnOutput(this, "GithubDeployRoleArn", {
      value: githubDeployRole.roleArn,
      description: "Set as AWS_DEPLOY_ROLE_ARN GitHub Actions secret",
    });
  }
}
