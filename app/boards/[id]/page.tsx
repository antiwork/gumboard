import { BoardPage } from "@/components/board-page";

export default function DefaultBoardPage({ params }: { params: Promise<{ id: string }> }) {
  return <BoardPage params={params} isPublic={false} />;
}
