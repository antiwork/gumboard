import BoardPage from "@/components/board-page";

export default function PrivateBoardPage({ params }: { params: Promise<{ id: string }> }) {
  return <BoardPage params={params} isPublic={false} />;
}
