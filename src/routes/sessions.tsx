import { createFileRoute } from "@tanstack/react-router";
import { ChallengeSession } from "@/components/ChallengeSession";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Sessions — BuildMyLogic" }] }),
  component: ChallengeSession,
});
