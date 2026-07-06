import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getAwsClientConfig } from "./awsCredentials";
import type { Task, Completion } from "./types";

const TASKS_TABLE = process.env.HABIT_TASKS_TABLE ?? "habit-tasks";
const COMPLETIONS_TABLE = process.env.HABIT_COMPLETIONS_TABLE ?? "habit-completions";

// Reuse a single client across warm invocations.
const client = DynamoDBDocumentClient.from(new DynamoDBClient(getAwsClientConfig()), {
  marshallOptions: { removeUndefinedValues: true },
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function listTasks(userId: string): Promise<Task[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: TASKS_TABLE,
      KeyConditionExpression: "userId = :u",
      ExpressionAttributeValues: { ":u": userId },
    })
  );
  return (res.Items ?? []) as Task[];
}

export async function getTask(userId: string, taskId: string): Promise<Task | null> {
  const res = await client.send(
    new GetCommand({ TableName: TASKS_TABLE, Key: { userId, taskId } })
  );
  return (res.Item as Task) ?? null;
}

export async function putTask(task: Task): Promise<Task> {
  await client.send(new PutCommand({ TableName: TASKS_TABLE, Item: task }));
  return task;
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  await client.send(
    new DeleteCommand({ TableName: TASKS_TABLE, Key: { userId, taskId } })
  );
}

// ---------------------------------------------------------------------------
// Completions
// ---------------------------------------------------------------------------

/** All completions for a single date (used by the "today" view). */
export async function listCompletionsForDate(
  userId: string,
  date: string
): Promise<Completion[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: COMPLETIONS_TABLE,
      KeyConditionExpression: "userId = :u AND begins_with(sk, :d)",
      ExpressionAttributeValues: { ":u": userId, ":d": `${date}#` },
    })
  );
  return (res.Items ?? []) as Completion[];
}

/** Completions across a date range (used by history / heat-map views). */
export async function listCompletionsBetween(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Completion[]> {
  const res = await client.send(
    new QueryCommand({
      TableName: COMPLETIONS_TABLE,
      KeyConditionExpression: "userId = :u AND sk BETWEEN :s AND :e",
      ExpressionAttributeValues: {
        ":u": userId,
        ":s": `${startDate}#`,
        ":e": `${endDate}#￿`,
      },
    })
  );
  return (res.Items ?? []) as Completion[];
}

export async function setCompletion(userId: string, taskId: string, date: string): Promise<void> {
  const completion: Completion = {
    userId,
    sk: `${date}#${taskId}`,
    taskId,
    date,
    completedAt: new Date().toISOString(),
  };
  await client.send(new PutCommand({ TableName: COMPLETIONS_TABLE, Item: completion }));
}

export async function clearCompletion(userId: string, taskId: string, date: string): Promise<void> {
  await client.send(
    new DeleteCommand({
      TableName: COMPLETIONS_TABLE,
      Key: { userId, sk: `${date}#${taskId}` },
    })
  );
}

export { UpdateCommand };
