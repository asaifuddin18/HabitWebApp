import Link from "next/link";
import TaskForm from "../../components/TaskForm";

export default function NewTask() {
  return (
    <div>
      <Link href="/tasks" className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← Back to tasks
      </Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">New task</h1>
      <TaskForm />
    </div>
  );
}
