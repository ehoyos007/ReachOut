"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { useWorkflowStore } from "@/lib/store/workflowStore";
import { Loader2 } from "lucide-react";

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { loadWorkflow, isLoading, error, resetState } = useWorkflowStore();

  useEffect(() => {
    // Reset state when component mounts
    resetState();

    // Load the workflow
    loadWorkflow(workflowId).then((success) => {
      if (!success) {
        // Redirect to workflows list if not found
        router.push("/workflows");
      }
    });

    // Cleanup on unmount
    return () => {
      resetState();
    };
  }, [workflowId, loadWorkflow, resetState, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-gray-500">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-red-500">{error}</p>
          <button
            className="text-blue-500 underline"
            onClick={() => router.push("/workflows")}
          >
            Back to Workflows
          </button>
        </div>
      </div>
    );
  }

  return <WorkflowCanvas />;
}
