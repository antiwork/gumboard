import BoardPage from "@/components/board-page";

export default async function PrivateBoardPage({ params }: { params: Promise<{ id: string }> }) {
  return <BoardPage params={{...(await params), isPublic: false }} />;
}
