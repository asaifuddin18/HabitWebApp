#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { HabitStack } from "../lib/habit-stack";

const app = new cdk.App();

new HabitStack(app, "HabitStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  // The GitHub repo (owner/name) allowed to assume the GitHub Actions deploy role.
  githubRepo: app.node.tryGetContext("githubRepo") ?? "asaifuddin18/HabitWebApp",
  // Vercel OIDC issuer + project scope. Reuses the same team as CookBook.
  vercelTeamSlug: app.node.tryGetContext("vercelTeamSlug") ?? "asaifuddin18s-projects",
  vercelProject: app.node.tryGetContext("vercelProject") ?? "habit-web-app",
});
