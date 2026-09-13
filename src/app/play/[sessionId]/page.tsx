import PlayRoom from "./play-room";

export default async function PlaySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <PlayRoom sessionId={sessionId} />;
}
