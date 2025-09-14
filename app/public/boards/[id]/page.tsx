import { BoardPage } from "@/components/board-page";

export default function PublicBoardPage({ params }: { params: Promise<{ id: string }> }) {
  return <BoardPage params={params} isPublic={true} />;
}
